import path from "node:path";
import { pathToFileURL } from "node:url";

import { getResolvedRuntimeSettings } from "@/server/admin/settings";
import { buildHourlyMetrics } from "@/server/metrics/hourly";

interface MetricsAdapterModule {
  loadDataset: () => Promise<Parameters<typeof buildHourlyMetrics>[0]>;
  saveMetrics: (
    metrics: ReturnType<typeof buildHourlyMetrics>,
  ) => Promise<void>;
}

async function main() {
  const settings = await getResolvedRuntimeSettings();
  const adapterModulePath = settings.metricsAdapterModule;
  const resolvedAdapterModulePath = pathToFileURL(
    path.resolve(process.cwd(), adapterModulePath),
  ).href;
  const adapterModule = (await import(
    resolvedAdapterModulePath
  )) as MetricsAdapterModule;

  if (
    typeof adapterModule.loadDataset !== "function" ||
    typeof adapterModule.saveMetrics !== "function"
  ) {
    throw new Error(
      `Adapter module "${adapterModulePath}" must export loadDataset() and saveMetrics().`,
    );
  }

  const dataset = await adapterModule.loadDataset();
  const metrics = buildHourlyMetrics(dataset);
  await adapterModule.saveMetrics(metrics);

  console.log(`Backfilled ${metrics.length} hourly metric buckets.`);
}

void main();
