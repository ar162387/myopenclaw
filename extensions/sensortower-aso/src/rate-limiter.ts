function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class FixedIntervalRateLimiter {
  private queue: Promise<void> = Promise.resolve();
  private nextAllowedAt = 0;

  constructor(private readonly intervalMs: number) {}

  async waitTurn(): Promise<void> {
    let release!: () => void;
    const ticket = new Promise<void>((resolve) => {
      release = resolve;
    });

    const prev = this.queue;
    this.queue = prev.then(() => ticket).catch(() => ticket);
    await prev;

    try {
      const now = Date.now();
      const waitMs = Math.max(0, this.nextAllowedAt - now);
      if (waitMs > 0) {
        await sleep(waitMs);
      }
      this.nextAllowedAt = Date.now() + this.intervalMs;
    } finally {
      release();
    }
  }
}

const limiters = new Map<string, FixedIntervalRateLimiter>();

export function getRateLimiter(key: string, requestsPerMinute: number): FixedIntervalRateLimiter {
  const safeRpm = Math.max(1, Math.floor(requestsPerMinute));
  const intervalMs = Math.ceil(60_000 / safeRpm);
  const compositeKey = `${key}|${safeRpm}`;
  const existing = limiters.get(compositeKey);
  if (existing) {
    return existing;
  }
  const created = new FixedIntervalRateLimiter(intervalMs);
  limiters.set(compositeKey, created);
  return created;
}

export async function sleepMs(ms: number): Promise<void> {
  await sleep(Math.max(0, ms));
}
