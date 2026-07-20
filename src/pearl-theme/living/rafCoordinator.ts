/**
 * PEARL LIVING LAYER — shared rAF coordinator
 * ---------------------------------------------------------------------------
 * ONE requestAnimationFrame loop for all pointer-responsive work (halo +
 * panel parallax). Ref-counted: the loop starts on the first subscriber and is
 * cancelled when the last unsubscribes, so `frameLoops` never exceeds 1 no
 * matter how many surfaces subscribe. Ambient CSS animations do not use this —
 * they are declarative and driven by the compositor.
 */

import { diagnostics } from "./diagnostics";

type FrameCallback = (timestampMs: number) => void;

const subscribers = new Set<FrameCallback>();
let rafId: number | null = null;

function tick(t: number) {
  // Snapshot to tolerate unsubscribes during iteration.
  for (const cb of [...subscribers]) {
    try {
      cb(t);
    } catch {
      diagnostics.emit("pearl.living.error");
    }
  }
  rafId = subscribers.size > 0 ? requestAnimationFrame(tick) : null;
  if (rafId === null) diagnostics.frameDown();
}

/**
 * Subscribe a per-frame callback. Returns an unsubscribe function that is safe
 * to call more than once (idempotent) — important for React Strict Mode.
 */
export function subscribeFrame(cb: FrameCallback): () => void {
  subscribers.add(cb);
  if (rafId === null) {
    diagnostics.frameUp();
    rafId = requestAnimationFrame(tick);
  }
  let done = false;
  return () => {
    if (done) return;
    done = true;
    subscribers.delete(cb);
    if (subscribers.size === 0 && rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
      diagnostics.frameDown();
    }
  };
}

/** Test-only: current subscriber count. */
export function frameSubscriberCount(): number {
  return subscribers.size;
}
