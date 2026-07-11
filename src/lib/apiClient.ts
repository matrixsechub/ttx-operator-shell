import type {
  BehaviorIntelligenceResponse,
  BuildInfo,
  CatalogResponse,
  EngineHealth,
  EngineVersion,
  ExperimentationAssignmentResponse,
  LoginPayload,
  LoginResponse,
  Operator,
  SystemStateResponse,
  SystemStatus,
  AiUsageResponse,
} from "./types";
import { getToken, getStoredIdentity } from "./authToken";

export interface ApiSuccess<T> {
  ok: true;
  data: T;
  status: number;
}

export interface ApiFailure {
  ok: false;
  error: string;
  status?: number;
}

export type ApiResult<T> = ApiSuccess<T> | ApiFailure;

const DEFAULT_TIMEOUT_MS = 10_000;
const MAX_RETRIES = 2;
const BASE_RETRY_DELAY_MS = 200;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function attempt<T>(path: string, init: RequestInit | undefined, timeoutMs: number): Promise<ApiResult<T>> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  // Attach the operator's bearer token plus role/access_level, if present.
  // The Worker forwards these straight through to the Engine (new
  // Request(target, request) copies headers) — no Worker-side session
  // storage involved, and no enforcement happens here or in the Worker;
  // that's left to the Engine once it exists. If the caller already set
  // its own Authorization header (api.refresh sends the refresh token,
  // not the access token), that takes precedence — don't clobber it.
  const headers = new Headers(init?.headers);
  const token = getToken();
  if (token && !headers.has("Authorization")) headers.set("Authorization", `Bearer ${token}`);
  const identity = getStoredIdentity();
  if (identity?.role) headers.set("X-Operator-Role", identity.role);
  if (identity?.access_level) headers.set("X-Operator-Access-Level", identity.access_level);

  try {
    const response = await fetch(path, { ...init, headers, signal: controller.signal });

    if (!response.ok) {
      // Prefer the server's own explanation (e.g. auth.ts's "Invalid
      // credentials" / "Refresh token has been revoked") over a generic
      // status-code string — this was previously discarded entirely.
      let message = `Request failed with status ${response.status}`;
      try {
        const body = (await response.json()) as { error?: unknown };
        if (typeof body.error === "string" && body.error.trim()) message = body.error;
      } catch {
        // Response body wasn't JSON (or was empty) — keep the generic message.
      }
      return { ok: false, status: response.status, error: message };
    }

    const data = (await response.json()) as T;
    return { ok: true, data, status: response.status };
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      return { ok: false, error: "Request timed out" };
    }
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Network error",
    };
  } finally {
    clearTimeout(timeout);
  }
}

// Retries on timeout, network errors, and 5xx — never on 4xx, since those are
// definitive client failures a retry can't fix. Each attempt gets its own
// timeout window; backoff is capped and small since this proxies through a
// single Worker to one upstream, not a distributed system.
export async function request<T>(path: string, init?: RequestInit, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<ApiResult<T>> {
  let result = await attempt<T>(path, init, timeoutMs);

  for (let retryCount = 0; retryCount < MAX_RETRIES && !result.ok; retryCount++) {
    const isClientError = result.status !== undefined && result.status >= 400 && result.status < 500;
    if (isClientError) break;

    await delay(BASE_RETRY_DELAY_MS * 2 ** retryCount);
    result = await attempt<T>(path, init, timeoutMs);
  }

  return result;
}

export const api = {
  getCatalog: () => request<CatalogResponse>("/api/marketplace/catalog"),
  getSystemStatus: () => request<SystemStatus>("/api/system/status"),
  getSystemState: () => request<SystemStateResponse>("/api/system/state"),
  login: (payload: LoginPayload) =>
    request<LoginResponse>("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  me: () => request<{ operator: Operator }>("/api/auth/me"),
  refresh: (refreshToken: string) =>
    request<LoginResponse>("/api/auth/refresh", {
      method: "POST",
      headers: { Authorization: `Bearer ${refreshToken}` },
    }),
  logout: (refreshToken?: string) =>
    request<{ ok: true }>("/api/auth/logout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    }),
  // Worker self-health/version — unauthenticated, no external calls on the
  // Worker side. Any stored token/identity headers still ride along
  // automatically (same as every request() call), but engine.ts ignores
  // them entirely; nothing here depends on being logged in.
  engineHealth: () => request<EngineHealth>("/api/engine/health"),
  engineVersion: () => request<EngineVersion>("/api/engine/version"),
  buildInfo: () => request<BuildInfo>("/api/build-info"),
  getBehaviorIntelligence: () => request<BehaviorIntelligenceResponse>("/api/behavior/intelligence"),
  getExperimentationAssignment: (sessionId: string) =>
    request<ExperimentationAssignmentResponse>(
      `/api/experimentation/assignment?sessionId=${encodeURIComponent(sessionId)}`,
    ),
  getAiUsage: () => request<AiUsageResponse>("/api/ai/usage"),
};
