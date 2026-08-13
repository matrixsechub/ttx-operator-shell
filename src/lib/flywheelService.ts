import type { FlywheelApiResponse, FlywheelRun, FlywheelRunDetail } from "../../shared/flywheel/contracts";
import type { FlywheelStageDefinition } from "../../shared/flywheel/stages";
import { getToken } from "./authToken";

export interface FlywheelClientResult<T> { ok: true; data: T; status: number }
export interface FlywheelClientFailure { ok: false; error: string; code?: string; traceId?: string; status?: number }
export type FlywheelResult<T> = FlywheelClientResult<T> | FlywheelClientFailure;

async function call<T>(path: string, init: RequestInit = {}, signal?: AbortSignal): Promise<FlywheelResult<T>> {
  const headers = new Headers(init.headers); const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  try {
    const response = await fetch(path, { ...init, headers, signal });
    const envelope = await response.json() as FlywheelApiResponse<T>;
    if (!envelope.ok) return { ok: false, error: envelope.error.message, code: envelope.error.code, traceId: envelope.meta.traceId, status: response.status };
    return { ok: true, data: envelope.data, status: response.status };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") return { ok: false, error: "Request cancelled" };
    return { ok: false, error: error instanceof Error ? error.message : "Network error" };
  }
}

const body = (value: Record<string, unknown>) => JSON.stringify(value);
export const flywheelService = {
  listRuns: (signal?: AbortSignal) => call<{ runs: FlywheelRun[] }>("/api/flywheel", {}, signal),
  getStages: (signal?: AbortSignal) => call<{ stages: FlywheelStageDefinition[] }>("/api/flywheel/stages", {}, signal),
  getRun: (runId: string, signal?: AbortSignal) => call<FlywheelRunDetail>(`/api/flywheel/runs/${encodeURIComponent(runId)}`, {}, signal),
  createRun: (missionId: string) => call<{ run: FlywheelRun; replay: boolean }>("/api/flywheel/runs", { method: "POST", body: body({ missionId, idempotencyKey: crypto.randomUUID() }) }),
  command: (runId: string, command: string, payload: Record<string, unknown> = {}) => call<Record<string, unknown>>(`/api/flywheel/runs/${encodeURIComponent(runId)}/commands`, { method: "POST", body: body({ command, payload, idempotencyKey: crypto.randomUUID() }) }),
  approve: (runId: string, commandId: string, proposalId: string) => call<Record<string, unknown>>(`/api/flywheel/runs/${encodeURIComponent(runId)}/approve`, { method: "POST", body: body({ commandId, proposalId }) }),
  intervene: (runId: string, action: "pause" | "resume" | "safe-mode" | "terminate") => call<Record<string, unknown>>(`/api/flywheel/runs/${encodeURIComponent(runId)}/${action}`, { method: "POST", body: body({ idempotencyKey: crypto.randomUUID(), reason: "operator_intervention" }) }),
};
