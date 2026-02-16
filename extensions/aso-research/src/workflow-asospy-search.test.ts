import { describe, expect, it, vi } from "vitest";
import { waitForCompleteRows } from "./workflow-asospy-search.js";

describe("waitForCompleteRows", () => {
  it("waits until D/I and Age are populated before returning rows", async () => {
    const snapshots = [
      [{ appName: "App A" }],
      [{ appName: "App A", dailyInstalls: "3.2k" }],
      [{ appName: "App A", dailyInstalls: "3.2k", age: "2 years" }],
    ];
    const extractRows = vi.fn().mockImplementation(async () => snapshots.shift() ?? []);
    const wait = vi.fn().mockResolvedValue(undefined);

    const rows = await waitForCompleteRows({
      overlayTimeoutMs: 3_000,
      limit: 20,
      extractRows,
      wait,
    });

    expect(rows).toEqual([{ appName: "App A", dailyInstalls: "3.2k", age: "2 years" }]);
    expect(extractRows).toHaveBeenCalledTimes(3);
  });

  it("returns only rows that contain both D/I and Age when timeout is reached", async () => {
    let now = 0;
    const extractRows = vi.fn().mockResolvedValue([
      { appName: "App A", dailyInstalls: "9.1k", age: "3 years" },
      { appName: "App B", dailyInstalls: "1.2k" },
    ]);
    const wait = vi.fn().mockImplementation(async () => {
      now += 400;
    });

    const rows = await waitForCompleteRows({
      overlayTimeoutMs: 1_000,
      limit: 20,
      extractRows,
      wait,
      now: () => now,
    });

    expect(rows).toEqual([{ appName: "App A", dailyInstalls: "9.1k", age: "3 years" }]);
  });

  it("throws when no row ever gets both D/I and Age", async () => {
    let now = 0;
    const extractRows = vi.fn().mockResolvedValue([
      { appName: "App A" },
      { appName: "App B", dailyInstalls: "1.2k" },
    ]);
    const wait = vi.fn().mockImplementation(async () => {
      now += 500;
    });

    await expect(
      waitForCompleteRows({
        overlayTimeoutMs: 1_100,
        limit: 20,
        extractRows,
        wait,
        now: () => now,
      }),
    ).rejects.toThrow("D/I and Age did not populate");
  });
});
