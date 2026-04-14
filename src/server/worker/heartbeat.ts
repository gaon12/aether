import type {
  WorkerHeartbeatRepository,
  WorkerRuntimeConfig,
} from "@/server/worker/types";
import type { WorkerHeartbeatsTable } from "@/types/db";

function createHeartbeatRecord(
  config: WorkerRuntimeConfig,
  status: string,
): WorkerHeartbeatsTable {
  const now = new Date().toISOString();

  return {
    worker_run_id: config.workerRunId,
    hostname: config.hostname,
    pid: process.pid,
    status,
    heartbeat_at: now,
    created_at: now,
  };
}

export function startWorkerHeartbeat(
  repository: WorkerHeartbeatRepository,
  config: WorkerRuntimeConfig,
  initialStatus: string = "running",
) {
  let status = initialStatus;

  const writeHeartbeat = async () => {
    await repository.saveHeartbeat(createHeartbeatRecord(config, status));
  };

  void writeHeartbeat();

  const interval = setInterval(() => {
    void writeHeartbeat();
  }, config.heartbeatIntervalMs);

  return {
    async pulse(nextStatus = status) {
      status = nextStatus;
      await repository.saveHeartbeat(createHeartbeatRecord(config, status));
    },
    stop() {
      clearInterval(interval);
    },
  };
}
