import { useEffect, useMemo, useState } from "react";
import { StatusPill } from "./StatusPill";
import { useApiResource } from "../lib/useApiResource";
import { ttxScoringService } from "../lib/ttxScoringService";
import type { TtxScorePacket } from "../lib/ttxTypes";

// Post-session score display (Phase 32, redesigned Phase 33) — the one
// "hero" surface in the cockpit, shown only at the session-complete
// moment, so it earns the op-panel-raised treatment and entrance motion
// that the always-on widgets deliberately don't have.
//
// Visual hierarchy: ring gauge + banded score (primary) → breakdown
// metric tiles (secondary) → role-action accordion (tertiary) → trend
// sparkline (context). Everything uses the existing @theme tokens in
// src/styles/index.css — the only token added for this redesign is
// --animate-rise; color/spacing/radius stay on the established system
// (op-* colors, rounded-sm, the 4px spacing scale) because cockpit
// consistency beats novelty.
//
// Motion: ring sweep (CSS stroke-dashoffset transition), number count-up
// (rAF), staggered rise on the metric tiles. All three collapse to their
// final frame under prefers-reduced-motion — via motion-reduce: variants
// for the CSS pieces and a matchMedia check for the count-up.
//
// The trend sparkline reads the existing GET /api/ttx/sessions/scores
// (Phase 32) once — no polling: the list is historical and this panel
// only exists after a session ends. Fetch failure just omits the chart.

const RING_RADIUS = 52;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
const COUNT_UP_MS = 900;
const TREND_POINTS = 10;

interface ScoreBand {
  label: string;
  tone: "ok" | "warn" | "danger";
  text: string;
  strokeVar: string;
}

function bandFor(score: number): ScoreBand {
  if (score >= 70) return { label: "strong", tone: "ok", text: "text-op-accent", strokeVar: "var(--color-op-accent)" };
  if (score >= 40) return { label: "mixed", tone: "warn", text: "text-op-amber", strokeVar: "var(--color-op-amber)" };
  return { label: "degraded", tone: "danger", text: "text-op-danger", strokeVar: "var(--color-op-danger)" };
}

// Local to this file, not a shared data hook — animation utility only.
function useCountUp(target: number, durationMs: number): number {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setValue(target);
      return;
    }
    let frame: number;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, durationMs]);

  return value;
}

function ScoreGauge({ score, band }: { score: number; band: ScoreBand }) {
  // Starts fully empty; the offset flips to the real value one frame after
  // mount so the CSS transition performs the sweep.
  const [revealed, setRevealed] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setRevealed(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const displayed = useCountUp(score, COUNT_UP_MS);
  const offset = revealed ? RING_CIRCUMFERENCE * (1 - score / 100) : RING_CIRCUMFERENCE;

  return (
    <div className="relative h-28 w-28 shrink-0" role="img" aria-label={`Session score ${score} out of 100`}>
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle cx="60" cy="60" r={RING_RADIUS} fill="none" stroke="var(--color-op-border)" strokeWidth="8" />
        <circle
          cx="60"
          cy="60"
          r={RING_RADIUS}
          fill="none"
          stroke={band.strokeVar}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={RING_CIRCUMFERENCE}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-1000 ease-out motion-reduce:transition-none"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-3xl ${band.text}`}>{displayed}</span>
        <span className="text-[10px] uppercase tracking-widest text-op-text-dim">/ 100</span>
      </div>
    </div>
  );
}

function MetricTile({
  label,
  value,
  activeClass,
  delayMs,
}: {
  label: string;
  value: number;
  activeClass: string;
  delayMs: number;
}) {
  return (
    <div
      className="animate-rise rounded-sm border border-op-border-bright px-2.5 py-2 motion-reduce:animate-none"
      style={{ animationDelay: `${delayMs}ms` }}
    >
      {/* Zero renders dim, not in semantic color — a clean run shouldn't
          show alarm-red zeros. */}
      <span className={`block text-lg leading-none ${value > 0 ? activeClass : "text-op-text-dim"}`}>{value}</span>
      <span className="mt-1 block text-[9px] uppercase tracking-widest text-op-text-dim/70">{label}</span>
    </div>
  );
}

function TrendSparkline({ scores, currentSessionId, band }: { scores: TtxScorePacket[]; currentSessionId: string; band: ScoreBand }) {
  const points = useMemo(() => {
    const ordered = [...scores].sort((a, b) => a.computedAt.localeCompare(b.computedAt)).slice(-TREND_POINTS);
    const step = ordered.length > 1 ? 92 / (ordered.length - 1) : 0;
    return ordered.map((packet, index) => ({
      x: 4 + index * step,
      y: 26 - (packet.score / 100) * 22,
      current: packet.sessionId === currentSessionId,
    }));
  }, [scores, currentSessionId]);

  if (points.length < 2) return null;

  return (
    <div className="animate-rise motion-reduce:animate-none" style={{ animationDelay: "340ms" }}>
      <div className="flex items-baseline justify-between">
        <span className="text-[9px] uppercase tracking-widest text-op-text-dim/70">Trend</span>
        <span className="text-[9px] text-op-text-dim/60">last {points.length} sessions</span>
      </div>
      <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="mt-1 h-8 w-full" aria-hidden="true">
        <polyline
          points={points.map((p) => `${p.x},${p.y}`).join(" ")}
          fill="none"
          stroke="var(--color-op-text-dim)"
          strokeWidth="1"
          strokeOpacity="0.5"
        />
        {points.map((p, index) => (
          <circle
            key={index}
            cx={p.x}
            cy={p.y}
            r={p.current ? 2.5 : 1.5}
            fill={p.current ? band.strokeVar : "var(--color-op-text-dim)"}
          />
        ))}
      </svg>
    </div>
  );
}

export function TTXScorePanel({ packet }: { packet: TtxScorePacket }) {
  const band = bandFor(packet.score);
  const { recommendedTaken, recommendedMissed } = packet.roleActions;
  const hasRoleActions = recommendedTaken.length > 0 || recommendedMissed.length > 0;

  // Fetch-once (no pollIntervalMs) — see header comment.
  const { result: trendResult } = useApiResource(() => ttxScoringService.listScores());
  const trendScores = trendResult?.ok ? trendResult.data.scores : [];

  function handleDownload() {
    const json = JSON.stringify(packet, null, 2);
    const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `ttx-score-${packet.sessionId}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="op-panel-raised mt-3 animate-rise rounded-sm p-4 motion-reduce:animate-none" aria-label="Session score">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h3 className="text-[10px] uppercase tracking-widest text-op-text-dim">Session Score</h3>
          <StatusPill tone={band.tone}>{band.label}</StatusPill>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-op-text-dim/60">{new Date(packet.computedAt).toLocaleTimeString()}</span>
          <button type="button" onClick={handleDownload} className="text-[10px] uppercase tracking-widest text-op-accent hover:underline">
            download
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 items-center gap-4 sm:grid-cols-[auto_1fr]">
        <ScoreGauge score={packet.score} band={band} />

        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-3 gap-2">
            <MetricTile label="Mitigating" value={packet.breakdown.mitigations} activeClass="text-op-accent" delayMs={100} />
            <MetricTile label="Risk Escalations" value={packet.breakdown.riskEscalations} activeClass="text-op-danger" delayMs={180} />
            <MetricTile label="Delays" value={packet.breakdown.delays} activeClass="text-op-amber" delayMs={260} />
          </div>
          <TrendSparkline scores={trendScores} currentSessionId={packet.sessionId} band={band} />
        </div>
      </div>

      {hasRoleActions && (
        // Missed recommendations are the thing an operator must not scroll
        // past, so the accordion defaults open only when there are misses.
        <details className="group mt-3 border-t border-op-border pt-3" open={recommendedMissed.length > 0}>
          <summary className="flex cursor-pointer list-none items-center gap-1.5 text-[10px] uppercase tracking-widest text-op-text-dim hover:text-op-text">
            <span className="inline-block transition-transform group-open:rotate-90 motion-reduce:transition-none">▸</span>
            Role Actions
            <span className="normal-case tracking-normal text-op-text-dim/60">
              ({recommendedTaken.length} taken · {recommendedMissed.length} missed)
            </span>
          </summary>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {recommendedTaken.map((action) => (
              <span
                key={`taken-${action}`}
                className="rounded-sm border border-op-accent/40 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-op-accent"
              >
                + {action}
              </span>
            ))}
            {recommendedMissed.map((action) => (
              <span
                key={`missed-${action}`}
                className="rounded-sm border border-op-danger/40 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-op-danger"
              >
                − {action}
              </span>
            ))}
          </div>
        </details>
      )}
    </section>
  );
}
