import { useState } from "react";
import { StatusPill } from "./StatusPill";
import { useApiResource } from "../lib/useApiResource";
import { operatorDashboardService } from "../lib/operatorDashboardService";

function truncateHash(hash: string): string {
  if (hash.length <= 24) return hash;
  return `${hash.slice(0, 12)}…${hash.slice(-12)}`;
}

export function BeaconPanel() {
  const [showRaw, setShowRaw] = useState(false);
  const { result, loading, refresh } = useApiResource(operatorDashboardService.getBeacon, {
    pollIntervalMs: 15_000,
  });
  const draft = useApiResource(operatorDashboardService.getBeaconV2Draft, { pollIntervalMs: 60_000 });

  const beacon = result?.ok ? result.data : null;
  const payload = beacon?.payload as Record<string, unknown> | undefined;
  const axis = Array.isArray(payload?.axis) ? (payload.axis as string[]) : [];
  const priorities = Array.isArray(payload?.priorities) ? (payload.priorities as string[]) : [];
  const authority = payload?.authority as Record<string, string> | undefined;

  return (
    <div id="beacon-panel" className="op-panel rounded-sm p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xs uppercase tracking-widest text-op-text-dim">Beacon</h2>
          <p className="mt-1 text-[11px] text-op-text-dim">Immutable Northstar document and integrity hash.</p>
        </div>
        <button
          type="button"
          onClick={() => refresh()}
          className="rounded-sm border border-op-border-bright px-3 py-1.5 text-[11px] uppercase tracking-widest text-op-text-dim hover:border-op-accent/50"
        >
          {loading ? "syncing…" : "refresh"}
        </button>
      </div>

      {!result ? (
        <p className="mt-4 text-xs text-op-text-dim">Loading beacon…</p>
      ) : !result.ok ? (
        <p className="mt-4 text-xs text-op-danger">{result.error}</p>
      ) : (
        <div className="mt-4 flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <StatusPill tone={beacon?.safe_mode ? "danger" : "ok"}>
              {beacon?.safe_mode ? "safe mode" : String(payload?.state ?? "ACTIVE")}
            </StatusPill>
            <span className="font-mono text-xs text-op-text">v{beacon?.version ?? 1}</span>
            <span className="font-mono text-xs text-op-text-dim">{beacon?.id}</span>
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-widest text-op-text-dim">Integrity hash</p>
            <p className="mt-1 font-mono text-xs break-all text-op-text">{truncateHash(beacon?.hash ?? "")}</p>
          </div>

          {axis.length > 0 ? (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-op-text-dim">Priority order</p>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-xs text-op-text">
                {axis.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ol>
            </div>
          ) : null}

          {authority ? (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-op-text-dim">Authority</p>
              <ul className="mt-2 space-y-1 text-xs text-op-text">
                <li>Operator: {authority.operator}</li>
                <li>AI Council: {authority.aiCouncil}</li>
                <li>Agents: {authority.agents}</li>
              </ul>
            </div>
          ) : null}

          {typeof payload?.mandate === "string" ? (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-op-text-dim">Mandate</p>
              <p className="mt-2 text-xs leading-relaxed text-op-text">{payload.mandate}</p>
            </div>
          ) : null}

          {priorities.length > 0 ? (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-op-text-dim">Priorities</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-op-text">
                {priorities.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {draft.result?.ok && draft.result.data.draft ? (
            <p className="text-[11px] text-op-text-dim">
              Beacon v2 draft available (inactive). View via /api/beacon/v2/draft.
            </p>
          ) : null}

          <button
            type="button"
            onClick={() => setShowRaw((v) => !v)}
            className="self-start rounded-sm border border-op-border-bright px-3 py-1.5 text-[11px] uppercase tracking-widest text-op-text-dim hover:border-op-accent/50"
          >
            {showRaw ? "hide raw json" : "show raw json"}
          </button>

          {showRaw && payload ? (
            <pre className="max-h-80 overflow-auto rounded-sm border border-op-border bg-op-bg p-3 font-mono text-[10px] text-op-text">
              {JSON.stringify(beacon, null, 2)}
            </pre>
          ) : null}
        </div>
      )}
    </div>
  );
}
