import type { BrowserContext } from "playwright-core";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { chromium } from "playwright-core";

export type LaunchChromeWithAsospyOptions = {
  /** Path to unpacked ASOspy extension for --load-extension. */
  asospyExtensionPath?: string;
  /** Ignored: extension loading requires Playwright Chromium (Chrome/Edge do not honor --load-extension). */
  chromiumExecutablePath?: string;
  /** Run headless (Chrome 128+ new headless supports extensions). Default true. */
  headless?: boolean;
};

/**
 * Launches Chromium with ASOspy loaded via --load-extension using a temp profile.
 * Uses --headless=new when headless so extensions work (Chrome 128+).
 * Caller must call context.close() when done.
 * Important: Google Chrome and Edge do not honor --load-extension / --disable-extensions-except.
 * We always use Playwright's Chromium (channel: "chromium") so the extension actually loads.
 */
export async function launchChromeWithAsospy(
  opts: LaunchChromeWithAsospyOptions,
): Promise<BrowserContext> {
  const { asospyExtensionPath, headless = true } = opts;

  if (!asospyExtensionPath) {
    throw new Error("ASOspy configuration missing. Set asospyExtensionPath.");
  }

  const extPathResolved = requireExistingDirectory(asospyExtensionPath, "ASOspy extension path");
  const extPath = copyExtensionToPathWithoutSpaces(extPathResolved);
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "aso-research-"));
  const args: string[] = [
    `--disable-extensions-except=${extPath}`,
    `--load-extension=${extPath}`,
    "--enable-extensions",
    "--no-first-run",
    "--no-default-browser-check",
  ];
  if (headless) {
    args.push("--headless=new");
    args.push("--disable-gpu");
    if (process.platform === "linux") {
      args.push("--disable-dev-shm-usage");
    }
  }
  const launchOpts = {
    headless,
    // Playwright defaults disable extensions; remove that for unpacked extension mode.
    ignoreDefaultArgs: ["--disable-extensions"] as string[],
    args,
  };

  try {
    return await chromium.launchPersistentContext(userDataDir, {
      channel: "chromium",
      ...launchOpts,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("Executable doesn't exist")) {
      throw new Error(
        "Chromium for Playwright is not installed. Run: npx playwright install chromium",
        { cause: err },
      );
    }
    throw err;
  }
}

function requireExistingDirectory(inputPath: string, label: string): string {
  const resolved = path.resolve(inputPath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`${label} not found: ${resolved}`);
  }
  if (!fs.statSync(resolved).isDirectory()) {
    throw new Error(`${label} is not a directory: ${resolved}`);
  }
  return resolved;
}

/**
 * Chrome can fail to load extensions when the path contains spaces (e.g. "Application Support").
 * Copy to a temp dir with no spaces so --load-extension gets a reliable path.
 */
function copyExtensionToPathWithoutSpaces(extensionDir: string): string {
  if (!extensionDir.includes(" ")) {
    return extensionDir;
  }
  const destDir = fs.mkdtempSync(path.join(os.tmpdir(), "asospy-ext-"));
  copyDirRecursive(extensionDir, destDir);
  return destDir;
}

function copyDirRecursive(src: string, dest: string): void {
  fs.mkdirSync(dest, { recursive: true });
  for (const name of fs.readdirSync(src)) {
    const srcPath = path.join(src, name);
    const destPath = path.join(dest, name);
    const stat = fs.statSync(srcPath);
    if (stat.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function requireExistingFile(inputPath: string, label: string): string {
  const resolved = path.resolve(inputPath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`${label} not found: ${resolved}`);
  }
  if (!fs.statSync(resolved).isFile()) {
    throw new Error(`${label} is not a file: ${resolved}`);
  }
  return resolved;
}
