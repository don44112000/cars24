/**
 * Client-side rate limiter for Gemini calls.
 *
 * Gemini's free tier caps you at a fixed number of requests per minute
 * (RPM). When the user uploads many documents and clicks Extract, we'd
 * otherwise fire all 9 calls within a few hundred milliseconds. That's fine
 * at 9 calls but blows up if they retry rapidly or have multiple windows
 * open.
 *
 * This module enforces a rolling 60-second window. `acquireSlot()` resolves
 * immediately if there's room under the cap; otherwise it sleeps until the
 * oldest timestamp ages out. Calls are serialised through a chained promise
 * so the bookkeeping is consistent across concurrent callers.
 *
 * The cap is read from `VITE_GEMINI_RPM` (default 18 — leaves headroom
 * under the typical 20 RPM free-tier limit). Set it to your actual quota.
 */

const WINDOW_MS = 60_000;
const DEFAULT_RPM = 18;

const timestamps: number[] = [];
let queue: Promise<void> = Promise.resolve();

let extraCooldownUntil = 0;

function getRpm(): number {
  const fromEnv = import.meta.env.VITE_GEMINI_RPM;
  const n = Number(fromEnv);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_RPM;
}

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

/**
 * Acquire a slot in the rolling window. Resolves when the caller is allowed
 * to make a request. Internally awaits the prior `queue` so consumers run
 * one at a time through the bookkeeping.
 */
export async function acquireSlot(): Promise<void> {
  const next = queue.then(async () => {
    const limit = getRpm();
    while (true) {
      const now = Date.now();

      // Honour any extra cooldown set by a 429 response.
      if (now < extraCooldownUntil) {
        await sleep(extraCooldownUntil - now + 25);
        continue;
      }

      // Drop timestamps older than the window.
      while (timestamps.length > 0 && now - timestamps[0] >= WINDOW_MS) {
        timestamps.shift();
      }

      if (timestamps.length < limit) {
        timestamps.push(now);
        return;
      }

      // Wait until the oldest timestamp ages out.
      const waitMs = WINDOW_MS - (now - timestamps[0]) + 25;
      await sleep(waitMs);
    }
  });
  // Keep the chain alive even if a caller throws after acquiring.
  queue = next.catch(() => undefined);
  await next;
}

/**
 * Tell the limiter we just got a 429. Inserts a hard cooldown window so the
 * next acquireSlot() definitely waits.
 */
export function notifyRateLimited(retryAfterSeconds: number | undefined): void {
  const cooldownMs = ((retryAfterSeconds && retryAfterSeconds > 0) ? retryAfterSeconds : 5) * 1000;
  const until = Date.now() + cooldownMs;
  if (until > extraCooldownUntil) extraCooldownUntil = until;
}

export function rateLimiterState(): {
  limit: number;
  used: number;
  remaining: number;
  cooldownMsRemaining: number;
} {
  const limit = getRpm();
  const now = Date.now();
  while (timestamps.length > 0 && now - timestamps[0] >= WINDOW_MS) {
    timestamps.shift();
  }
  return {
    limit,
    used: timestamps.length,
    remaining: Math.max(0, limit - timestamps.length),
    cooldownMsRemaining: Math.max(0, extraCooldownUntil - now),
  };
}
