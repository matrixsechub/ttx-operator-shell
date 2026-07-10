import { StatusPill } from "./StatusPill";
import { useDebouncedSystemState } from "../lib/useDebouncedSystemState";
import type { SystemStateResponse } from "../lib/types";

type Tone = "ok" | "warn" | "danger";
type SystemState = SystemStateResponse["state"];

const LATENCY_P95_WARN_MS = 800;
const LATENCY_P95_CRITICAL_MS = 2000;
const VOLATILITY_CRITICAL = 80;
const VOLATILITY_WARN = 50;

function toneForHealth(overall: string | undefined): Tone {
  if (overall === "CRITICAL") return "danger";
  if (overall === "DEGRADED") return "warn";
  return "ok";
}

function toneForPolicyMode(mode: string): Tone {
  if (mode === "RESTRICTIVE") return "danger";
  if (mode === "strict") return "warn";
  return "ok";
}

function toneForVolatility(value: number): Tone {
  if (value > VOLATILITY_CRITICAL) return "danger";
  if (value > VOLATILITY_WARN) return "warn";
  return "ok";
}

function toneForLatencyP95(ms: number): Tone {
  if (ms > LATENCY_P95_CRITICAL_MS) return "danger";
  if (ms > LATENCY_P95_WARN_MS) return "warn";
  return "ok";
}

function toneForErrors(count: number): Tone {
  if (count > 20) return "danger";
  if (count > 0) return "warn";
  return "ok";
}

function HudMetric({
  label,
  value,
  tone,
  compact,
}: {
  label: string;
  value: string;
  tone: Tone;
  compact?: boolean;
}) {
  const border =
    tone === "danger"
      ? "border-op-danger/40 bg-op-danger/5"
      : tone === "warn"
        ? "border-op-amber/40 bg-op-amber/5"
        : "border-op-accent/30 bg-op-accent/5";

  return (
    <div className={`rounded-sm border px-2.5 py-2 ${border} ${compact ? "min-w-0" : ""}`}>
      <p className="text-[9px] uppercase tracking-widest text-op-text-dim">{label}</p>
      <p className={`mt-0.5 font-mono text-xs ${compact ? "truncate" : ""}`}>{value}</p>
    </div>
  );
}

function HudSkeleton({ compact }: { compact?: boolean }) {
  return (
    <div className={`op-panel animate-pulse rounded-sm ${compact ? "px-3 py-2" : "p-4"}`}>
      <div className="h-3 w-24 rounded bg-op-border" />
      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-10 rounded bg-op-border/60" />
        ))}
      </div>
    </div>
  );
}

function resolveOverallHealth(state: SystemState): "STABLE" | "DEGRADED" | "CRITICAL" {
  if (state.health?.overall) return state.health.overall;
  if (!state.ghost?.connected) return "CRITICAL";
  const errors = typeof state.telemetry.errorCount === "number" ? state.telemetry.errorCount : 0;
  if (errors > 50) return "CRITICAL";
  if (state.governanceSource === "fallback" || state.ghost?.derived || errors > 0) return "DEGRADED";
  return "STABLE";
}

function HudContent({ state, compact }: { state: SystemState; compact?: boolean }) {
  const depth = state.ghost?.depth ?? {};
  const volatility = typeof depth.volatility === "number" ? depth.volatility : 0;
  const spectralDensity = typeof depth.spectralDensity === "number" ? depth.spectralDensity : 0;
  const oversoulDepth = typeof depth.oversoulDepth === "number" ? depth.oversoulDepth : 0;
  const agentActivationCount =
    typeof depth.agentActivationCount === "number" ? depth.agentActivationCount : 0;

  const telemetry = state.telemetry;
  const requestCount = typeof telemetry.requestCount === "number" ? telemetry.requestCount : 0;
  const latencyP50 = typeof telemetry.latencyP50Ms === "number" ? telemetry.latencyP50Ms : 0;
  const latencyP95 = typeof telemetry.latencyP95Ms === "number" ? telemetry.latencyP95Ms : 0;
  const errorCount = typeof telemetry.errorCount === "number" ? telemetry.errorCount : 0;
  const sessionEvents = typeof telemetry.sessionEvents === "number" ? telemetry.sessionEvents : 0;

  const northstar = state.governance.northstar.statement;
  const northstarDisplay =
    compact && northstar.length > 48 ? `${northstar.slice(0, 48)}…` : northstar;

  const healthOverall = resolveOverallHealth(state);
  const governanceMode = state.policy.mode;
  const signalStates = state.signalStates ?? [];
  const policyAdjustments = state.policyAdjustments ?? [];
  const proposals = state.proposals ?? [];

  return (
    <div
      id="system-hud"
      className={`op-panel rounded-sm border-op-border-bright/50 ${compact ? "px-3 py-2" : "p-4"}`}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-[10px] uppercase tracking-[0.35em] text-op-text-dim">System HUD</p>
        <div className="flex items-center gap-2">
          {state.ghost?.derived && (
            <span className="text-[9px] uppercase tracking-widest text-op-amber">ghost derived</span>
          )}
          <StatusPill tone={toneForHealth(healthOverall)}>{healthOverall}</StatusPill>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className={`grid gap-2 ${compact ? "grid-cols-2 lg:grid-cols-4" : "grid-cols-1 sm:grid-cols-3"}`}>
          <HudMetric label="Northstar" value={northstarDisplay} tone="ok" compact={compact} />
          <HudMetric label="System Mode" value={state.systemMode} tone="ok" compact={compact} />
          <HudMetric
            label="Overall Health"
            value={healthOverall}
            tone={toneForHealth(healthOverall)}
            compact={compact}
          />
          {!compact && (
            <HudMetric
              label="Governance"
              value={governanceMode}
              tone={toneForPolicyMode(governanceMode)}
            />
          )}
        </div>

        {signalStates.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {signalStates.map((flag) => (
              <StatusPill
                key={flag}
                tone={flag === "HIGH_RISK" || flag === "ERROR_STATE" ? "danger" : "warn"}
              >
                {flag}
              </StatusPill>
            ))}
          </div>
        )}

        {!compact && policyAdjustments.length > 0 && (
          <p className="text-[10px] text-op-amber">{policyAdjustments.join(" · ")}</p>
        )}

        {proposals.length > 0 && (
          <div className="flex flex-col gap-1">
            <p className="text-[9px] uppercase tracking-widest text-op-text-dim">Governance proposals (advisory)</p>
            <div className="flex flex-wrap gap-1.5">
              {proposals.map((proposal) => (
                <StatusPill
                  key={proposal.id}
                  tone={proposal.priority === "high" ? "danger" : "warn"}
                >
                  {proposal.type}
                </StatusPill>
              ))}
            </div>
          </div>
        )}

        <div className={`grid gap-2 ${compact ? "grid-cols-2 lg:grid-cols-4" : "grid-cols-2 sm:grid-cols-4"}`}>
          <HudMetric
            label="Volatility"
            value={String(volatility)}
            tone={toneForVolatility(volatility)}
            compact={compact}
          />
          <HudMetric
            label="Spectral Density"
            value={String(spectralDensity)}
            tone={toneForVolatility(spectralDensity)}
            compact={compact}
          />
          <HudMetric label="Oversoul Depth" value={String(oversoulDepth)} tone={oversoulDepth < 40 ? "warn" : "ok"} compact={compact} />
          <HudMetric label="Agent Activations" value={String(agentActivationCount)} tone="ok" compact={compact} />
        </div>

        {!compact && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <HudMetric label="Requests" value={String(requestCount)} tone="ok" />
            <HudMetric
              label="Latency P50 / P95"
              value={`${latencyP50} / ${latencyP95} ms`}
              tone={toneForLatencyP95(latencyP95)}
            />
            <HudMetric label="Errors" value={String(errorCount)} tone={toneForErrors(errorCount)} />
            <HudMetric label="Session Events" value={String(sessionEvents)} tone={sessionEvents > 10 ? "warn" : "ok"} />
          </div>
        )}

        {compact && (
          <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono text-op-text-dim">
            <span className={toneForErrors(errorCount) === "ok" ? "text-op-accent" : "text-op-amber"}>
              err {errorCount}
            </span>
            <span className={toneForLatencyP95(latencyP95) === "ok" ? "text-op-accent" : "text-op-amber"}>
              p95 {latencyP95}ms
            </span>
            <span>req {requestCount}</span>
            <span>sess {sessionEvents}</span>
          </div>
        )}
      </div>

      <p className="mt-2 text-[9px] text-op-text-dim/70">source: /api/system/state · poll 4s</p>
    </div>
  );
}

export function SystemHUD({ compact = false }: { compact?: boolean }) {
  const { state, loading, error, syncing } = useDebouncedSystemState();

  if (loading) return <HudSkeleton compact={compact} />;

  if (error || !state) {
    return (
      <div className="op-panel rounded-sm border-op-danger/40 p-3 text-xs text-op-danger">
        System HUD offline — {error ?? "no state"}
      </div>
    );
  }

  return (
    <div className={syncing ? "opacity-90 transition-opacity" : "opacity-100 transition-opacity"}>
      <HudContent state={state} compact={compact} />
    </div>
  );
}
