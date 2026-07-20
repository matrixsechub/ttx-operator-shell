/**
 * PEARL LIVING LAYER — root provider + decorative host
 * ---------------------------------------------------------------------------
 * Wraps a Pearl surface, derives the Living runtime state from the environment
 * detectors, and:
 *   - publishes `{ state, shouldAnimate }` via LivingContext;
 *   - toggles `data-living="on"` on its root element ONLY when active, so every
 *     ambient CSS animation (scoped `[data-living="on"] …`) runs only then;
 *   - hosts the always-decorative layers (tide, fog, pointer halo, motes) as
 *     `pointer-events:none` siblings that never intercept interaction;
 *   - runs the pointer-halo and ghost-mote engines under the same gate.
 *
 * Under reduced motion the state is "reduced": `data-living` is never set, no
 * engine binds, and living.css additionally force-nulls animation as defense in
 * depth. The wrapped content renders identically with or without any of this —
 * motion is decorative only.
 */

import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { LivingContext, type LivingContextValue } from "./LivingContext";
import type { LivingState } from "./diagnostics";
import { diagnostics } from "./diagnostics";
import { useReducedMotion, useDocumentVisibility, useInView } from "./useEnvironment";
import { usePointerHalo, useGhostMotes } from "./behaviors";

export function LivingRoot({ children, className = "" }: { children: ReactNode; className?: string }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const motesRef = useRef<HTMLDivElement>(null);

  const reduced = useReducedMotion();
  const visible = useDocumentVisibility();
  const inView = useInView(rootRef, "120px");

  const state: LivingState = reduced ? "reduced" : !visible ? "hidden" : !inView ? "offscreen" : "active";
  const shouldAnimate = state === "active";

  const value = useMemo<LivingContextValue>(() => ({ state, shouldAnimate }), [state, shouldAnimate]);

  // Publish state + toggle the ambient-animation gate attribute.
  useEffect(() => {
    diagnostics.setState(state);
    const el = rootRef.current;
    if (!el) return;
    if (shouldAnimate) el.setAttribute("data-living", "on");
    else el.removeAttribute("data-living");
  }, [state, shouldAnimate]);

  // Low-frequency lifecycle events (no coordinates / no per-frame data).
  useEffect(() => {
    diagnostics.emit("pearl.living.initialized");
    return () => diagnostics.emit("pearl.living.cleanup");
  }, []);

  useEffect(() => {
    diagnostics.emit(shouldAnimate ? "pearl.living.resumed" : "pearl.living.suspended");
  }, [shouldAnimate]);

  usePointerHalo(rootRef, shouldAnimate);
  useGhostMotes(motesRef, shouldAnimate);

  return (
    <LivingContext.Provider value={value}>
      <div ref={rootRef} className={`pearl-living-root ${className}`.trim()}>
        <div className="pearl-living-decor" aria-hidden="true">
          <div className="pearl-tide" />
          <div className="pearl-fog" />
          <div className="pearl-halo" />
          <div ref={motesRef} className="pearl-motes" />
        </div>
        {children}
      </div>
    </LivingContext.Provider>
  );
}
