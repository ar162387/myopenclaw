import fs from "node:fs";
import os from "node:os";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockLaunchPersistentContext } = vi.hoisted(() => ({
  mockLaunchPersistentContext: vi.fn(),
}));

vi.mock("playwright-core", () => ({
  chromium: {
    launchPersistentContext: mockLaunchPersistentContext,
  },
}));

import { launchChromeWithAsospy } from "./chrome-asospy.js";

describe("launchChromeWithAsospy", () => {
  beforeEach(() => {
    mockLaunchPersistentContext.mockReset().mockResolvedValue({} as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("loads unpacked ASOspy extension in temp profile mode", async () => {
    vi.spyOn(fs, "existsSync").mockReturnValue(true);
    vi.spyOn(fs, "statSync").mockReturnValue({ isDirectory: () => true } as unknown as fs.Stats);
    vi.spyOn(os, "tmpdir").mockReturnValue("/tmp");
    vi.spyOn(fs, "mkdtempSync").mockReturnValue("/tmp/aso-research-abc123");

    await launchChromeWithAsospy({
      asospyExtensionPath: "/extensions/asospy",
    });

    expect(mockLaunchPersistentContext).toHaveBeenCalledWith(
      "/tmp/aso-research-abc123",
      expect.objectContaining({
        channel: "chromium",
        headless: true,
        ignoreDefaultArgs: ["--disable-extensions"],
        args: expect.arrayContaining([
          "--disable-extensions-except=/extensions/asospy",
          "--load-extension=/extensions/asospy",
          "--enable-extensions",
          "--headless=new",
          "--disable-gpu",
        ]),
      }),
    );
  });

  it("always uses channel chromium so extension loads (Chrome/Edge ignore --load-extension)", async () => {
    vi.spyOn(fs, "existsSync").mockReturnValue(true);
    vi.spyOn(fs, "statSync").mockReturnValue({ isDirectory: () => true } as unknown as fs.Stats);
    vi.spyOn(os, "tmpdir").mockReturnValue("/tmp");
    vi.spyOn(fs, "mkdtempSync").mockReturnValue("/tmp/aso-research-xyz");

    await launchChromeWithAsospy({
      asospyExtensionPath: "/extensions/asospy",
      chromiumExecutablePath: "/usr/local/bin/chromium",
    });

    expect(mockLaunchPersistentContext).toHaveBeenCalledWith(
      "/tmp/aso-research-xyz",
      expect.objectContaining({
        channel: "chromium",
        headless: true,
        ignoreDefaultArgs: ["--disable-extensions"],
      }),
    );
    expect(mockLaunchPersistentContext.mock.calls[0][1]).not.toHaveProperty("executablePath");
  });

  it("runs headed when headless: false", async () => {
    vi.spyOn(fs, "existsSync").mockReturnValue(true);
    vi.spyOn(fs, "statSync").mockReturnValue({ isDirectory: () => true } as unknown as fs.Stats);
    vi.spyOn(os, "tmpdir").mockReturnValue("/tmp");
    vi.spyOn(fs, "mkdtempSync").mockReturnValue("/tmp/aso-research-headed");

    await launchChromeWithAsospy({
      asospyExtensionPath: "/extensions/asospy",
      headless: false,
    });

    const call = mockLaunchPersistentContext.mock.calls[0];
    expect(call[1]).toMatchObject({ headless: false });
    expect(call[1].args).not.toContain("--headless=new");
  });

  it("throws when extension path is not configured", async () => {
    await expect(launchChromeWithAsospy({})).rejects.toThrow(
      "ASOspy configuration missing. Set asospyExtensionPath.",
    );
  });
});
