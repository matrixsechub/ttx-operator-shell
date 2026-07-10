// Phase 36 — Live TTX session service.
// REST client for host operations and a WebSocket manager that reconnects
// automatically. Mirrors the pattern of ttxSessionService.ts.

import { request, type ApiResult } from "./apiClient";
import type { PublicLiveTtxState, ServerMessage } from "./liveTtxProtocol";

// Re-export the protocol types so components don't import from liveTtxProtocol directly.
export type { PublicLiveTtxState, ServerMessage };
export type { LiveParticipant, LiveVote, LiveEvent, LiveSessionStatus } from "./liveTtxProtocol";

// ── REST calls (host-only, require operator Bearer token) ─────────────────

export const liveSessionService = {
  createSession: (scenarioId: string): Promise<ApiResult<{ sessionId: string; code: string; hostToken: string }>> =>
    request("/api/ttx/live/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scenarioId }),
    }),

  generateToken: (
    code: string,
    name: string,
    role: string,
    isObserver?: boolean,
  ): Promise<ApiResult<{ participantId: string; token: string }>> =>
    request("/api/ttx/live/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, name, role, isObserver }),
    }),

  getState: (code: string): Promise<ApiResult<{ state: PublicLiveTtxState }>> =>
    request(`/api/ttx/live/state?code=${encodeURIComponent(code)}`),

  closeSession: (code: string, action?: "archive"): Promise<ApiResult<{ ok: boolean }>> =>
    request(`/api/ttx/live/close?code=${encodeURIComponent(code)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    }),
};

// ── WebSocket manager ─────────────────────────────────────────────────────

const RECONNECT_DELAYS_MS = [500, 1000, 2000, 4000, 8000];

export type LiveWsStatus = "connecting" | "open" | "reconnecting" | "closed";

export interface LiveSessionWs {
  send(msg: object): void;
  close(): void;
  onStatus(cb: (status: LiveWsStatus) => void): void;
  onState(cb: (state: PublicLiveTtxState) => void): void;
  onError(cb: (code: string, message: string) => void): void;
}

export function connectToLiveSession(joinToken: string): LiveSessionWs {
  let ws: WebSocket | null = null;
  let closed = false;
  let attempt = 0;

  const statusCbs: Array<(s: LiveWsStatus) => void> = [];
  const stateCbs: Array<(s: PublicLiveTtxState) => void> = [];
  const errorCbs: Array<(code: string, msg: string) => void> = [];

  function emit(msg: ServerMessage) {
    if (msg.type === "state.update") stateCbs.forEach((cb) => cb(msg.state));
    else if (msg.type === "error") errorCbs.forEach((cb) => cb(msg.code, msg.message));
  }

  function setStatus(s: LiveWsStatus) {
    statusCbs.forEach((cb) => cb(s));
  }

  function buildWsUrl(): string {
    const base = window.location.origin.replace(/^http/, "ws");
    return `${base}/api/ttx/live/join?token=${encodeURIComponent(joinToken)}`;
  }

  function connect() {
    if (closed) return;
    setStatus(attempt === 0 ? "connecting" : "reconnecting");
    ws = new WebSocket(buildWsUrl());

    ws.onopen = () => {
      attempt = 0;
      setStatus("open");
    };

    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data as string) as ServerMessage;
        emit(msg);
      } catch {
        // Malformed frame — ignore.
      }
    };

    ws.onclose = () => {
      if (closed) { setStatus("closed"); return; }
      const delay = RECONNECT_DELAYS_MS[Math.min(attempt, RECONNECT_DELAYS_MS.length - 1)] ?? 8000;
      attempt += 1;
      setTimeout(connect, delay);
    };

    ws.onerror = () => {
      // onclose fires right after onerror — reconnect handled there.
    };
  }

  connect();

  return {
    send(msg: object) {
      if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
    },
    close() {
      closed = true;
      ws?.close();
    },
    onStatus(cb) { statusCbs.push(cb); },
    onState(cb) { stateCbs.push(cb); },
    onError(cb) { errorCbs.push(cb); },
  };
}

// Build a participant join URL from the current origin + token.
export function buildJoinUrl(token: string): string {
  return `${window.location.origin}/join?token=${encodeURIComponent(token)}`;
}
