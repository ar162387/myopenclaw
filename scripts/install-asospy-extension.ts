#!/usr/bin/env bun
/**
 * Download and unpack the ASOspy Chrome extension for headless/CLI use (e.g. Linux without GUI).
 * Unpacks to a fixed path so resolveAsospyExtensionPath() finds it without config.
 *
 * Usage: bun scripts/install-asospy-extension.ts
 *
 * Requires: curl, unzip (or 7z on some systems). On Debian/Ubuntu: apt install curl unzip
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execSync } from "node:child_process";

const ASOSPY_EXTENSION_ID = "djldgekfnmbecjgdfnbnilgoojfihfli";
const CHROME_UPDATE_URL =
  "https://clients2.google.com/service/update2/crx?response=redirect&os=linux&arch=x64&prod=chromiumcrx&prodchannel=stable&prodversion=131.0&acceptformat=crx3&x=id%3D" +
  ASOSPY_EXTENSION_ID +
  "%26installsource%3Dondemand%26uc";

function getInstallDir(): string {
  const env = process.env;
  if (env.ASOSPY_EXTENSION_INSTALL_DIR?.trim()) {
    return path.resolve(env.ASOSPY_EXTENSION_INSTALL_DIR.trim());
  }
  const dataHome =
    env.XDG_DATA_HOME?.trim() || path.join(os.homedir(), ".local", "share");
  return path.join(dataHome, "asospy-extension");
}

function main(): void {
  const installDir = getInstallDir();
  const crxPath = path.join(os.tmpdir(), `asospy-${ASOSPY_EXTENSION_ID}.crx`);

  console.log("Downloading ASOspy extension from Chrome Web Store...");
  try {
    execSync(`curl -fsSL -o "${crxPath}" "${CHROME_UPDATE_URL}"`, {
      stdio: "inherit",
      shell: true,
    });
  } catch (e) {
    console.error("Download failed. Ensure curl is installed and the URL is reachable.");
    throw e;
  }

  if (!fs.existsSync(crxPath) || fs.statSync(crxPath).size < 100) {
    throw new Error("Downloaded file is missing or too small.");
  }

  const buf = fs.readFileSync(crxPath);
  if (buf.length < 16) {
    throw new Error("CRX file too short.");
  }
  const magic = buf.subarray(0, 4).toString("ascii");
  if (magic !== "Cr24") {
    throw new Error(`Not a CRX3 file (magic: ${magic}).`);
  }
  const headerLen = buf.readUInt32LE(8);
  const zipOffset = 12 + headerLen;
  if (zipOffset >= buf.length) {
    throw new Error("Invalid CRX header length.");
  }

  const zipPath = path.join(os.tmpdir(), `asospy-${ASOSPY_EXTENSION_ID}.zip`);
  fs.writeFileSync(zipPath, buf.subarray(zipOffset));

  fs.mkdirSync(installDir, { recursive: true });
  try {
    execSync(`unzip -o -q "${zipPath}" -d "${installDir}"`, { stdio: "inherit" });
  } catch {
    try {
      execSync(`7z x -y "${zipPath}" -o"${installDir}"`, { stdio: "inherit" });
    } catch (e2) {
      throw new Error("Need unzip or 7z to unpack. Install with: apt install unzip");
    }
  }

  fs.unlinkSync(crxPath);
  fs.unlinkSync(zipPath);

  const manifestPath = path.join(installDir, "manifest.json");
  if (!fs.existsSync(manifestPath)) {
    throw new Error("Unpacked extension has no manifest.json.");
  }

  console.log("Installed to:", installDir);
  console.log("");
  console.log("Next: ensure the path is used (one of):");
  console.log("  1. Export for this shell: export ASOSPY_EXTENSION_PATH=\"" + installDir + "\"");
  console.log("  2. Add to ~/.profile or ~/.bashrc: export ASOSPY_EXTENSION_PATH=\"" + installDir + "\"");
  console.log("  3. Or do nothing: the ASO research tool will auto-detect this path.");
}

main();
