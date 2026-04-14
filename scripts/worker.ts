import { randomUUID } from "node:crypto";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { getResolvedRuntimeSettings } from "@/server/admin/settings";
import { checkAndRefreshAllTokens } from "@/server/threads/token";
import {
  startTokenScheduler,
  stopTokenScheduler,
} from "@/server/threads/tokenScheduler";
import {
  createWorkerRuntime,
  loadWorkerAdapter,
} from "@/server/worker/runtime";

async function main() {
  const settings = await getResolvedRuntimeSettings();
  const adapterModulePath = settings.workerAdapterModule;
  const resolvedAdapterModulePath = pathToFileURL(
    path.resolve(process.cwd(), adapterModulePath),
  ).href;
  const [dependencies] = await Promise.all([
    loadWorkerAdapter(resolvedAdapterModulePath),
  ]);
  const runtime = createWorkerRuntime(dependencies, {
    workerRunId: randomUUID(),
    hostname: os.hostname(),
    pollIntervalMs: settings.workerPollIntervalMs,
    heartbeatIntervalMs: settings.workerHeartbeatIntervalMs,
    botHandle: settings.botHandle ?? undefined,
    defaultSummaryLength: settings.defaultSummaryLength,
    minSourceCharacters: settings.minSourceCharacters,
    maxSummaryLength: settings.maxSummaryLength,
    textAggregationMode: settings.textAggregationMode,
  });

  try {
    console.log("[worker] Checking Threads token status on startup...");
    await checkAndRefreshAllTokens();
    console.log("[worker] Startup token check completed.");
  } catch (error) {
    console.error("[worker] Startup token check failed:", error);
  }

  startTokenScheduler(settings.tokenCheckIntervalMs);

  const shutdown = () => {
    stopTokenScheduler();
    runtime.stop();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  await runtime.runLoop();
}

void main();
