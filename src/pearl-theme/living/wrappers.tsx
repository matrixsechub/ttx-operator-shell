/**
 * PEARL LIVING LAYER — primitive wrappers
 * ---------------------------------------------------------------------------
 * Thin composition wrappers that attach per-element Living behavior to the
 * EXISTING substrate primitives WITHOUT modifying them (the substrate stays the
 * authority). Each wrapper reads the single `shouldAnimate` gate from context,
 * so all of them go inert together under reduced motion / hidden / offscreen.
 *
 *   LivingGlassPanel  — GlassPanel + bounded pointer parallax + refraction sheen
 *   LivingGoldButton  — GoldActionButton + bounded click ripple
 *   LivingTelemetryCard — TelemetryCard + per-row value heartbeat (change only)
 */

import { useEffect, useRef, type ReactNode } from "react";
import { GlassPanel } from "../components/Panels";
import { GoldActionButton } from "../components/Buttons";
import { TelemetryCard, type TelemetryRow } from "../components/Telemetry";
import { useLiving } from "./LivingContext";
import { usePanelParallax, useGoldRipple } from "./behaviors";
import { diagnostics } from "./diagnostics";

/** GlassPanel that tilts subtly toward the pointer and carries a refraction sheen. */
export function LivingGlassPanel({ children, label, className = "" }: {
  children: ReactNode;
  label?: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { shouldAnimate } = useLiving();
  usePanelParallax(ref, shouldAnimate);
  return (
    <div ref={ref} className="pearl-living-panel">
      <span className="pearl-sheen" aria-hidden="true" />
      <GlassPanel label={label} className={className}>
        {children}
      </GlassPanel>
    </div>
  );
}

/** GoldActionButton with a bounded warm-light ripple on click. */
export function LivingGoldButton({ children, onClick, className = "" }: {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const { shouldAnimate } = useLiving();
  useGoldRipple(ref, shouldAnimate);
  return (
    <span ref={ref} className="pearl-living-btn">
      <GoldActionButton className={className} onClick={onClick}>
        {children}
      </GoldActionButton>
    </span>
  );
}

/**
 * TelemetryCard whose values beat once when they change. The heartbeat targets
 * the real substrate `.pearl-tele-val` nodes (found by row order) — no timers,
 * no fabricated feed; a beat happens only in response to a genuine value change.
 */
export function LivingTelemetryCard({ title, rows }: { title: string; rows: readonly TelemetryRow[] }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const prev = useRef<readonly TelemetryRow[]>(rows);
  const { shouldAnimate } = useLiving();

  useEffect(() => {
    const wrap = wrapRef.current;
    const previous = prev.current;
    prev.current = rows;
    if (!wrap) return;
    const valEls = wrap.querySelectorAll<HTMLElement>(".pearl-tele-val");
    const records: { timer: ReturnType<typeof setTimeout>; el: HTMLElement; settled: boolean }[] = [];
    rows.forEach((row, i) => {
      const before = previous[i];
      if (!before || before.value === row.value) return;
      const el = valEls[i];
      if (!el || !shouldAnimate) return; // reduced/suspended → value updates, no beat
      el.classList.add("pearl-beat");
      diagnostics.timerUp();
      const rec = {
        el,
        settled: false,
        timer: setTimeout(() => {
          el.classList.remove("pearl-beat");
          rec.settled = true;
          diagnostics.timerDown();
        }, 950),
      };
      records.push(rec);
    });
    return () => {
      for (const rec of records) {
        clearTimeout(rec.timer);
        rec.el.classList.remove("pearl-beat");
        if (!rec.settled) {
          rec.settled = true;
          diagnostics.timerDown();
        }
      }
    };
  }, [rows, shouldAnimate]);

  return (
    <div ref={wrapRef} className="pearl-living-telemetry">
      <TelemetryCard title={title} rows={rows} />
    </div>
  );
}
