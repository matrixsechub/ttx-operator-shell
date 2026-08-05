import { InfoCard } from "../../components/InfoCard";
import { StatusPill } from "../../components/StatusPill";
import { useApiResource } from "../../lib/useApiResource";
import { ttxIntelligenceService } from "../../lib/ttxIntelligenceService";
import type { TtxDecisionType, TtxIntelligenceTrend, TtxScoreBand } from "../../lib/ttxTypes";

// Phase 38 — surfaces the Phase 35 intelligence engine
// (worker/ttxIntelligence.ts), which shipped with no UI consumer. The
// packet is an aggregate derived on read across every scored session; it
// has no scenario filter, so this panel is deliberately global and does
// not read ScenarioContext.

const BAND_TONE: Record<TtxScoreBand, "ok" | "warn" | "danger"> = {
  strong: "ok",
  mixed: "warn",
  degraded: "danger",
};

const TREND_TONE: Record<TtxIntelligenceTrend, "ok" | "warn" | "neutral"> = {
  improving: "ok",
  declining: "warn",
  stable: "neutral",
};

const DECISION_LABEL: Record<TtxDecisionType, string> = {
  mitigating: "Mitigating",
  "risk-escalating": "Risk-escalating",
  delay: "Delay",
};

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-sm border border-op-border-bright px-3 py-2">
      <p className="text-[10px] uppercase tracking-widest text-op-text-dim">{label}</p>
      <div className="mt-1 flex items-center gap-2 text-sm text-op-text">{children}</div>
    </div>
  );
}

export function TTXIntelligence() {
  const { result, loading, refresh } = useApiResource(() => ttxIntelligenceService.getIntelligence());

  const packet = result?.ok ? result.data : null;

  // strongest and weakest come from the same ranking; when only one
  // decision type has ever occurred they are the same value, which would
  // otherwise render as a contradiction.
  const singleDecisionType =
    packet !== null &&
    packet.strongestDecisionType !== null &&
    packet.strongestDecisionType === packet.weakestDecisionType;

  return (
    <InfoCard label="Intelligence">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-xs text-op-text-dim">Aggregate view across every scored session.</p>
        <button
          type="button"
          onClick={() => refresh()}
          className="shrink-0 text-[10px] uppercase tracking-widest text-op-accent hover:underline"
        >
          {loading ? "syncing…" : "refresh"}
        </button>
      </div>

      {!result ? (
        <p className="text-xs italic text-op-text-dim">Loading intelligence…</p>
      ) : !result.ok ? (
        <p className="text-xs italic text-op-text-dim">Could not load intelligence — {result.error}.</p>
      ) : !packet || packet.sessionsAnalyzed === 0 ? (
        <p className="text-xs italic text-op-text-dim">
          No scored sessions yet — nothing to analyze. Run a session to completion and score it to build a baseline.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="grid gap-2 sm:grid-cols-3">
            <Stat label="Sessions analyzed">{packet.sessionsAnalyzed}</Stat>

            <Stat label="Average score">
              {packet.averageScore === null ? (
                <span className="text-xs italic text-op-text-dim">not available</span>
              ) : (
                <>
                  <span className="text-op-accent">{packet.averageScore}</span>
                  {packet.scoreBand && <StatusPill tone={BAND_TONE[packet.scoreBand]}>{packet.scoreBand}</StatusPill>}
                </>
              )}
            </Stat>

            <Stat label="Trend">
              <StatusPill tone={TREND_TONE[packet.trend]}>{packet.trend}</StatusPill>
            </Stat>
          </div>

          <div className="rounded-sm border border-op-border-bright px-3 py-2">
            <p className="text-[10px] uppercase tracking-widest text-op-text-dim">Decision types</p>

            {packet.strongestDecisionType === null ? (
              <p className="mt-1 text-xs italic text-op-text-dim">
                No scored decisions recorded yet across these sessions.
              </p>
            ) : singleDecisionType ? (
              <p className="mt-1 text-xs text-op-text-dim">
                Only one decision type recorded so far —{" "}
                <span className="text-op-text">{DECISION_LABEL[packet.strongestDecisionType]}</span>. A second type is
                needed before strongest and weakest differ.
              </p>
            ) : (
              <div className="mt-1 flex flex-col gap-1 text-xs">
                <p className="text-op-text-dim">
                  Strongest: <span className="text-op-accent">{DECISION_LABEL[packet.strongestDecisionType]}</span>
                </p>
                <p className="text-op-text-dim">
                  Weakest:{" "}
                  <span className="text-op-amber">
                    {packet.weakestDecisionType ? DECISION_LABEL[packet.weakestDecisionType] : "—"}
                  </span>
                </p>
              </div>
            )}

            <p className="mt-2 text-[10px] text-op-text-dim">
              Ranked by impact — occurrence count times each type's scoring weight — so a frequent but mild category
              cannot outrank a rare but costly one.
            </p>
          </div>

          <p className="text-[10px] text-op-text-dim">
            Computed {new Date(packet.computedAt).toLocaleString()} · derived on read, not stored.
          </p>
        </div>
      )}
    </InfoCard>
  );
}
