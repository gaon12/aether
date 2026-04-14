import { checkAndRefreshAllTokens } from "./token";

let schedulerInterval: NodeJS.Timeout | null = null;
const DEFAULT_TOKEN_CHECK_INTERVAL_MS = 1000 * 60 * 60 * 6;

/**
 * Starts a periodic scheduler to check and refresh all Threads tokens.
 * Defaults to every 6 hours if no interval is provided.
 */
export function startTokenScheduler(
  intervalMs: number = DEFAULT_TOKEN_CHECK_INTERVAL_MS,
) {
  if (schedulerInterval) return;

  console.log(
    `[token-scheduler] Starting token scheduler (interval: ${intervalMs}ms)`,
  );

  schedulerInterval = setInterval(async () => {
    console.log("[token-scheduler] Running periodic token check...");
    try {
      await checkAndRefreshAllTokens();
      console.log("[token-scheduler] Token check completed.");
    } catch (err) {
      console.error("[token-scheduler] Periodic token check failed:", err);
    }
  }, intervalMs);
}

/**
 * Stops the token scheduler.
 */
export function stopTokenScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log("[token-scheduler] Token scheduler stopped.");
  }
}
