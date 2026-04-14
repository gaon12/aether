export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    console.log(
      "[instrumentation] Server starting, checking Threads tokens...",
    );
    const { checkAndRefreshAllTokens } = await import("@/server/threads/token");

    try {
      await checkAndRefreshAllTokens();
      console.log("[instrumentation] Threads token check completed.");
    } catch (err) {
      console.error(
        "[instrumentation] Failed to check Threads tokens on startup:",
        err,
      );
    }
  }
}
