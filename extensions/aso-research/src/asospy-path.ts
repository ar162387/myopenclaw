/**
 * Resolve ASOspy extension path: config → env ASOSPY_EXTENSION_PATH → common install locations.
 * Use env or auto-detect so Linux (or any host) works without editing openclaw.json.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const ASOSPY_EXTENSION_ID = "djldgekfnmbecjgdfnbnilgoojfihfli";

export type ResolveAsospyPathOptions = {
  /** From plugin config (asospyExtensionPath). */
  configPath?: string;
  /** Env object (default process.env). Use for tests. */
  env?: NodeJS.ProcessEnv;
};

/**
 * Returns the first valid path: config (if dir exists) → ASOSPY_EXTENSION_PATH → common paths.
 */
export function resolveAsospyExtensionPath(opts: ResolveAsospyPathOptions = {}): string | undefined {
  const env = opts.env ?? process.env;

  const fromConfig = typeof opts.configPath === "string" ? opts.configPath.trim() : undefined;
  if (fromConfig) {
    const resolved = path.resolve(fromConfig);
    if (fs.existsSync(resolved) && fs.statSync(resolved).isDirectory()) {
      return resolved;
    }
  }

  const fromEnv = env.ASOSPY_EXTENSION_PATH?.trim();
  if (fromEnv) {
    const resolved = path.resolve(fromEnv);
    if (fs.existsSync(resolved) && fs.statSync(resolved).isDirectory()) {
      return resolved;
    }
  }

  return findAsospyInCommonPaths();
}

/**
 * Check common Chrome/Chromium extension dirs for ASOspy (extension ID).
 * Returns first existing path to the extension version folder.
 */
function findAsospyInCommonPaths(): string | undefined {
  const home = os.homedir();
  const candidates: string[] = [];

  if (process.platform === "darwin") {
    candidates.push(
      path.join(home, "Library", "Application Support", "Google", "Chrome", "Default", "Extensions", ASOSPY_EXTENSION_ID),
    );
    candidates.push(
      path.join(home, "Library", "Application Support", "Chromium", "Default", "Extensions", ASOSPY_EXTENSION_ID),
    );
  } else if (process.platform === "linux") {
    candidates.push(
      path.join(home, ".config", "google-chrome", "Default", "Extensions", ASOSPY_EXTENSION_ID),
    );
    candidates.push(
      path.join(home, ".config", "google-chrome-beta", "Default", "Extensions", ASOSPY_EXTENSION_ID),
    );
    candidates.push(
      path.join(home, ".config", "chromium", "Default", "Extensions", ASOSPY_EXTENSION_ID),
    );
  }
  // Script-installed path (e.g. bun scripts/install-asospy-extension.ts)
  const dataHome =
    process.env.XDG_DATA_HOME?.trim() || path.join(home, ".local", "share");
  const scriptInstallDir = path.join(dataHome, "asospy-extension");
  candidates.push(scriptInstallDir);
  const envInstallDir = process.env.ASOSPY_EXTENSION_INSTALL_DIR?.trim();
  if (envInstallDir) {
    candidates.push(path.resolve(envInstallDir));
  }
  // Windows: could add %LOCALAPPDATA%\Google\Chrome\... if needed

  for (const baseDir of candidates) {
    if (!fs.existsSync(baseDir) || !fs.statSync(baseDir).isDirectory()) {
      continue;
    }
    const manifestInBase = path.join(baseDir, "manifest.json");
    if (fs.existsSync(manifestInBase)) {
      return baseDir;
    }
    const versionDirs = fs.readdirSync(baseDir);
    for (const name of versionDirs) {
      const versionPath = path.join(baseDir, name);
      if (fs.statSync(versionPath).isDirectory()) {
        const manifestPath = path.join(versionPath, "manifest.json");
        if (fs.existsSync(manifestPath)) {
          return versionPath;
        }
      }
    }
  }

  return undefined;
}
