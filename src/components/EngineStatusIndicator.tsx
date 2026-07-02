import { StatusPill } from "./StatusPill";
import { api } from "../lib/apiClient";
import { useApiResource } from "../lib/useApiResource";

// Reports the Worker's own liveness via GET /api/engine/health and
// /api/engine/version (worker/engine.ts) — not the external Engine's real
// status. That distinction matters: this can only ever say "the Worker
// answered," never "ENGINE_API_URL is reachable." For the latter, see
// Status.tsx / SystemTelemetryPanel, which proxy the real (and currently
// unreachable) external Engine and degrade gracefully.
//
// Deliberately auth-independent — no useAuth() here, no dependency on
// AuthContext at all — so it works identically whether rendered on the
// public Login page or inside the authenticated Dashboard.
export function EngineStatusIndicator() {
  const health = useApiResource(api.engineHealth, { pollIntervalMs: 30_000 });
  const version = useApiResource(api.engineVersion);

  const online = health.result?.ok && health.result.data.status === "ok";
  const statusLabel = health.loading && !health.result ? "checking…" : online ? "Online" : "Unknown";
  const versionLabel = version.result?.ok ? `v${version.result.data.version}` : version.loading ? "…" : "unknown";

  return (
    <div id="engine-status-indicator" className="op-panel flex flex-wrap items-center gap-2 rounded-sm p-2.5 text-[11px]">
      <StatusPill tone={!health.result ? "neutral" : online ? "ok" : "danger"}>{statusLabel}</StatusPill>
      <span className="text-op-text-dim">
        engine <span className="text-op-text">{versionLabel}</span>
      </span>
      {health.result?.ok && (
        <span className="text-op-text-dim/60 uppercase tracking-widest">{health.result.data.env}</span>
      )}
    </div>
  );
}
