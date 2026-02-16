import { afterEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { resolveAsospyExtensionPath } from "./asospy-path.js";

describe("resolveAsospyExtensionPath", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns config path when it exists", () => {
    vi.spyOn(fs, "existsSync").mockReturnValue(true);
    vi.spyOn(fs, "statSync").mockReturnValue({ isDirectory: () => true } as fs.Stats);
    expect(resolveAsospyExtensionPath({ configPath: "/custom/asospy" })).toBe(
      path.resolve("/custom/asospy"),
    );
  });

  it("returns env path when config missing and env set", () => {
    vi.spyOn(fs, "existsSync").mockReturnValue(true);
    vi.spyOn(fs, "statSync").mockReturnValue({ isDirectory: () => true } as fs.Stats);
    expect(
      resolveAsospyExtensionPath({ env: { ASOSPY_EXTENSION_PATH: "/env/path" } }),
    ).toBe(path.resolve("/env/path"));
  });

  it("prefers config over env when both set and exist", () => {
    vi.spyOn(fs, "existsSync").mockReturnValue(true);
    vi.spyOn(fs, "statSync").mockReturnValue({ isDirectory: () => true } as fs.Stats);
    expect(
      resolveAsospyExtensionPath({
        configPath: "/config/path",
        env: { ASOSPY_EXTENSION_PATH: "/env/path" },
      }),
    ).toBe(path.resolve("/config/path"));
  });

  it("falls back to env when config path does not exist", () => {
    let callCount = 0;
    vi.spyOn(fs, "existsSync").mockImplementation((p: string) => {
      callCount++;
      const r = path.resolve(p);
      if (r === path.resolve("/config/path")) return false;
      if (r === path.resolve("/env/path")) return true;
      return false;
    });
    vi.spyOn(fs, "statSync").mockReturnValue({ isDirectory: () => true } as fs.Stats);
    expect(
      resolveAsospyExtensionPath({
        configPath: "/config/path",
        env: { ASOSPY_EXTENSION_PATH: "/env/path" },
      }),
    ).toBe(path.resolve("/env/path"));
  });

  it("returns undefined when nothing set and common paths not found", () => {
    vi.spyOn(fs, "existsSync").mockReturnValue(false);
    vi.spyOn(os, "homedir").mockReturnValue("/home/user");
    expect(resolveAsospyExtensionPath({})).toBeUndefined();
  });

  it("returns common path when dir exists and has version subdir with manifest", () => {
    const home = "/home/user";
    vi.spyOn(os, "homedir").mockReturnValue(home);
    const baseDir =
      process.platform === "linux"
        ? path.join(home, ".config", "chromium", "Default", "Extensions", "djldgekfnmbecjgdfnbnilgoojfihfli")
        : path.join(home, "Library", "Application Support", "Chromium", "Default", "Extensions", "djldgekfnmbecjgdfnbnilgoojfihfli");
    const versionPath = path.join(baseDir, "5.2_0");
    vi.spyOn(fs, "existsSync").mockImplementation((p: string) => {
      const n = p.replace(/\\/g, "/");
      return n === baseDir.replace(/\\/g, "/") || n === versionPath.replace(/\\/g, "/") || n.endsWith("manifest.json");
    });
    vi.spyOn(fs, "statSync").mockReturnValue({ isDirectory: () => true } as fs.Stats);
    vi.spyOn(fs, "readdirSync").mockReturnValue(["5.2_0"] as unknown as fs.Dirent[]);
    const out = resolveAsospyExtensionPath({ env: {} });
    expect(out).toBeDefined();
    expect(out!).toContain("djldgekfnmbecjgdfnbnilgoojfihfli");
  });
});
