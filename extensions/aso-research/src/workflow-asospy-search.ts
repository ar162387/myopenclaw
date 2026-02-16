import { launchChromeWithAsospy } from "./chrome-asospy.js";

const WORK_SEARCH_BASE = "https://play.google.com/work/search";
const STORE_SEARCH_BASE = "https://play.google.com/store/search";
const METRICS_POLL_INTERVAL_MS = 400;
const EXTENSION_INJECT_DELAY_MS = 3000;

export type AsoPlaySearchRow = {
  appName: string;
  dailyInstalls?: string;
  age?: string;
  installs?: string;
  category?: string;
  packageId?: string;
  appUrl?: string;
};

export type RunAsoPlaySearchOptions = {
  keyword: string;
  hl: string;
  limit: number;
  asospyExtensionPath: string;
  chromiumExecutablePath?: string;
  overlayTimeoutMs: number;
  /** Run headless (default true). Chrome 128+ new headless supports extensions. */
  headless?: boolean;
  /** Use work search (default) or store search. Store search works without Workspace login. */
  useWorkSearch?: boolean;
};

export type WaitForCompleteRowsOptions = {
  overlayTimeoutMs: number;
  limit: number;
  extractRows: () => Promise<AsoPlaySearchRow[]>;
  wait: (ms: number) => Promise<void>;
  pollIntervalMs?: number;
  now?: () => number;
};

/**
 * Launches Chromium with ASOspy, navigates to Play Store work search, waits for overlay,
 * extracts app name, daily installs (D/I), and age from each card. Caller does not close context.
 */
export async function runAsoPlaySearch(opts: RunAsoPlaySearchOptions): Promise<AsoPlaySearchRow[]> {
  const {
    keyword,
    hl,
    limit,
    asospyExtensionPath,
    chromiumExecutablePath,
    overlayTimeoutMs,
    headless,
    useWorkSearch = true,
  } = opts;

  const context = await launchChromeWithAsospy({
    asospyExtensionPath,
    chromiumExecutablePath,
    headless,
  });

  try {
    const page = await context.newPage();
    const q = encodeURIComponent(keyword);
    const injectionTimeoutMs = Math.min(overlayTimeoutMs, 20_000);
    const tryUrl = (base: string) => `${base}?q=${q}&c=apps&hl=${hl}`;

    const urlsToTry = useWorkSearch
      ? [tryUrl(WORK_SEARCH_BASE), tryUrl(STORE_SEARCH_BASE)]
      : [tryUrl(STORE_SEARCH_BASE), tryUrl(WORK_SEARCH_BASE)];

    let injected = false;
    for (const url of urlsToTry) {
      await page.goto(url, { waitUntil: "load", timeout: 45_000 });
      await page.waitForTimeout(EXTENSION_INJECT_DELAY_MS);
      injected = await waitForAsospyInjection(page, injectionTimeoutMs);
      if (injected) break;
    }

    if (!injected) {
      throw new Error(
        "ASOspy extension was not injected on the Play Store page. Check extension loading permissions and asospyExtensionPath. Try useWorkSearch: false if work search requires login.",
      );
    }

    return await waitForCompleteRows({
      overlayTimeoutMs,
      limit,
      extractRows: () => extractRowsFromSearchPage(page, limit),
      wait: (ms) => page.waitForTimeout(ms),
    });
  } finally {
    await context.close();
  }
}

export async function waitForCompleteRows(opts: WaitForCompleteRowsOptions): Promise<AsoPlaySearchRow[]> {
  const pollIntervalMs = opts.pollIntervalMs ?? METRICS_POLL_INTERVAL_MS;
  const now = opts.now ?? Date.now;
  const startedAt = now();
  let bestCompleteRows: AsoPlaySearchRow[] = [];

  while (now() - startedAt < opts.overlayTimeoutMs) {
    const rows = await opts.extractRows();
    const completeRows = rows.filter(hasRequiredMetrics);

    if (completeRows.length > bestCompleteRows.length) {
      bestCompleteRows = completeRows;
    }

    const hasRows = rows.length > 0;
    const allRowsComplete = hasRows && completeRows.length === rows.length;
    const enoughCompleteRows = completeRows.length >= opts.limit;
    if (allRowsComplete || enoughCompleteRows) {
      return completeRows.slice(0, opts.limit);
    }

    await opts.wait(pollIntervalMs);
  }

  if (bestCompleteRows.length > 0) {
    return bestCompleteRows.slice(0, opts.limit);
  }

  throw new Error(
    "ASOspy injected but D/I and Age did not populate. Check ASOspy login/token and API reachability.",
  );
}

/**
 * Extracts app rows from the current Play Store work search page.
 * ASOspy overlay adds Installs, D/I, Age, Category under each app card.
 * Selectors are best-effort; inspect the live page if the extension UI changes.
 */
async function extractRowsFromSearchPage(
  page: import("playwright-core").Page,
  limit: number,
): Promise<AsoPlaySearchRow[]> {
  const rows: AsoPlaySearchRow[] = [];
  const seen = new Set<string>();

  const asospyCards = page.locator('[id^="item-"][id$="-app"], .cardApp');
  const asospyCount = await asospyCards.count();
  for (let i = 0; i < asospyCount && rows.length < limit; i++) {
    const card = asospyCards.nth(i);
    const href = await card.locator('a[href*="details?id="]').first().getAttribute("href");
    const packageId = packageIdFromHref(href);
    const appUrl = normalizePlayStoreUrl(href);
    const appName =
      (await card.locator(".cardBody h4").first().textContent().catch(() => null)) ??
      (await card.locator('a[href*="details?id="]').first().getAttribute("title").catch(() => null));
    const cardText = (await card.textContent().catch(() => null)) ?? "";

    pushRow(rows, seen, {
      appName,
      packageId,
      appUrl,
      dailyInstalls:
        (await card.locator(".daily-installs-value").first().textContent().catch(() => null)) ??
        extractLabeledValue(cardText, "D/I"),
      age:
        (await card.locator(".released-value").first().textContent().catch(() => null)) ??
        extractLabeledValue(cardText, "Age"),
      installs:
        (await card.locator(".installs-value").first().textContent().catch(() => null)) ??
        extractLabeledValue(cardText, "Installs"),
      category:
        (await card.locator(".category-value").first().textContent().catch(() => null)) ??
        extractLabeledValue(cardText, "Category"),
    });
  }

  if (rows.length >= limit) {
    return rows.slice(0, limit);
  }

  const links = page.locator('a[href*="/store/apps/details?id="], a[href*="/work/apps/details?id="]');
  const linkCount = await links.count();
  for (let i = 0; i < linkCount && rows.length < limit; i++) {
    const link = links.nth(i);
    const href = await link.getAttribute("href");
    const packageId = packageIdFromHref(href);
    const appUrl = normalizePlayStoreUrl(href);
    const appName =
      (await link.getAttribute("title")) ??
      (await link.locator(".DdYX5, .WsMG1c").first().textContent().catch(() => null)) ??
      (await link.textContent().catch(() => null));

    const container = link
      .locator(
        "xpath=ancestor::*[contains(@id,'item-') or contains(@class,'cardApp') or contains(@class,'uMConb') or contains(@class,'XUIuZ')][1]",
      )
      .first();
    const containerText =
      (await container.textContent().catch(() => null)) ?? (await link.textContent().catch(() => null)) ?? "";

    pushRow(rows, seen, {
      appName,
      packageId,
      appUrl,
      dailyInstalls:
        (await container.locator(".daily-installs-value").first().textContent().catch(() => null)) ??
        extractLabeledValue(containerText, "D/I"),
      age:
        (await container.locator(".released-value").first().textContent().catch(() => null)) ??
        extractLabeledValue(containerText, "Age"),
      installs:
        (await container.locator(".installs-value").first().textContent().catch(() => null)) ??
        extractLabeledValue(containerText, "Installs"),
      category:
        (await container.locator(".category-value").first().textContent().catch(() => null)) ??
        extractLabeledValue(containerText, "Category"),
    });
  }

  return rows.slice(0, limit);
}

function cleanValue(value: string | null | undefined): string | undefined {
  const text = (value ?? "").replace(/\s+/g, " ").trim();
  if (!text) {
    return undefined;
  }
  if (/^loading\.\.\.$/i.test(text) || text === "-" || text === "—") {
    return undefined;
  }
  return text;
}

function hasRequiredMetrics(row: AsoPlaySearchRow): boolean {
  return Boolean(row.dailyInstalls && row.age);
}

function packageIdFromHref(href: string | null | undefined): string | undefined {
  if (!href) {
    return undefined;
  }
  const match = href.match(/[?&]id=([^&]+)/);
  if (!match) {
    return undefined;
  }
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

function normalizePlayStoreUrl(href: string | null | undefined): string | undefined {
  if (!href) {
    return undefined;
  }
  const trimmed = href.trim();
  if (!trimmed) {
    return undefined;
  }
  if (trimmed.startsWith("https://") || trimmed.startsWith("http://")) {
    return trimmed;
  }
  if (trimmed.startsWith("//")) {
    return `https:${trimmed}`;
  }
  if (trimmed.startsWith("/")) {
    return `https://play.google.com${trimmed}`;
  }
  return undefined;
}

function extractLabeledValue(
  text: string,
  label: "Installs" | "D/I" | "Age" | "Category",
): string | undefined {
  const escaped = label.replace("/", "\\/");
  const colonMatch = text.match(new RegExp(`${escaped}\\s*:\\s*([^\\n]+)`, "i"));
  if (colonMatch) {
    return cleanValue(colonMatch[1]);
  }
  const lineMatch = text.match(new RegExp(`${escaped}\\s+([^\\n]+)`, "i"));
  if (lineMatch) {
    return cleanValue(lineMatch[1]);
  }
  return undefined;
}

function pushRow(rows: AsoPlaySearchRow[], seen: Set<string>, row: AsoPlaySearchRow): void {
  const appName = cleanValue(row.appName);
  if (!appName) {
    return;
  }
  const uniqueKey = row.packageId ?? row.appUrl ?? appName;
  if (seen.has(uniqueKey)) {
    return;
  }
  seen.add(uniqueKey);
  rows.push({
    appName: appName.slice(0, 200),
    dailyInstalls: cleanValue(row.dailyInstalls),
    age: cleanValue(row.age),
    installs: cleanValue(row.installs),
    category: cleanValue(row.category),
    packageId: row.packageId,
    appUrl: row.appUrl,
  });
}

async function waitForAsospyInjection(
  page: import("playwright-core").Page,
  timeoutMs: number,
): Promise<boolean> {
  try {
    await page.waitForFunction(
      () => {
        return (
          Boolean(document.querySelector("#asospyContainer")) ||
          Boolean(document.querySelector('[id^="item-"][id$="-app"]')) ||
          Boolean(document.querySelector(".cardApp")) ||
          Boolean(document.querySelector('a[href*="details?id="]')) ||
          Boolean(document.querySelector('[data-docid]'))
        );
      },
      { timeout: timeoutMs },
    );
    return true;
  } catch {
    return false;
  }
}
