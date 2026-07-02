import type { CatalogResponse, LoginPayload, LoginResponse, SystemStatus } from "./types";

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

  try {
    const response = await fetch(path, { ...init, signal: controller.signal });

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        error: `Request failed with status ${response.status}`,
      };
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
  login: (payload: LoginPayload) =>
    request<LoginResponse>("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
};
