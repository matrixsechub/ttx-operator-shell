/**
 * PEARL LIVING LAYER — diagnostics registry
 * ---------------------------------------------------------------------------
 * A single aggregate accounting surface for the Living Layer, exposed at
 * `window.__pearlLiving` for browser tests. It counts engines/frames/timers/
 * listeners/observers/decorative-nodes/motes so tests can prove lifecycle
 * correctness (e.g. "everything is 0 under reduced motion", "remount does not
 * multiply engines", "only one shared frame loop").
 *
 * PRIVACY: this NEVER records pointer coordinates, per-frame data, URLs, or any
 * personal data — only low-frequency lifecycle events and integer counters.
 * It is not wired to production telemetry in this phase.
 */

export type LivingState = "active" | "offscreen" | "hidden" | "reduced" | "unmounted";

export type LivingEvent =
  | "pearl.living.initialized"
  | "pearl.living.suspended"
  | "pearl.living.resumed"
  | "pearl.living.cleanup"
  | "pearl.living.error";

export interface LivingSnapshot {
  livingState: LivingState;
  enginesActive: number;
  frameLoops: number;
  timers: number;
  listeners: number;
  observers: number;
  decorativeNodes: number;
  motes: number;
  suspensionReason: LivingState | null;
  cleanupCount: number;
  lastEvent: LivingEvent | null;
}

class LivingDiagnostics {
  private engines = new Set<string>();
  private frameLoops = 0;
  private timers = 0;
  private listeners = 0;
  private observers = 0;
  private decorativeNodes = 0;
  private motes = 0;
  private state: LivingState = "unmounted";
  private cleanupCount = 0;
  private lastEvent: LivingEvent | null = null;

  engineUp(id: string) { this.engines.add(id); }
  engineDown(id: string) { this.engines.delete(id); }

  frameUp() { this.frameLoops += 1; }
  frameDown() { this.frameLoops = Math.max(0, this.frameLoops - 1); }

  timerUp() { this.timers += 1; }
  timerDown() { this.timers = Math.max(0, this.timers - 1); }

  listenerAdd() { this.listeners += 1; }
  listenerRemove() { this.listeners = Math.max(0, this.listeners - 1); }

  observerAdd() { this.observers += 1; }
  observerRemove() { this.observers = Math.max(0, this.observers - 1); }

  nodeAdd() { this.decorativeNodes += 1; }
  nodeRemove() { this.decorativeNodes = Math.max(0, this.decorativeNodes - 1); }

  moteAdd() { this.motes += 1; }
  moteRemove() { this.motes = Math.max(0, this.motes - 1); }

  setState(state: LivingState) { this.state = state; }

  /** Count a completed effect teardown (for remount-no-leak assertions). */
  cleanup() { this.cleanupCount += 1; }

  emit(event: LivingEvent) { this.lastEvent = event; }

  getSnapshot(): LivingSnapshot {
    const suspended = this.state !== "active" && this.state !== "unmounted";
    return {
      livingState: this.state,
      enginesActive: this.engines.size,
      frameLoops: this.frameLoops,
      timers: this.timers,
      listeners: this.listeners,
      observers: this.observers,
      decorativeNodes: this.decorativeNodes,
      motes: this.motes,
      suspensionReason: suspended ? this.state : null,
      cleanupCount: this.cleanupCount,
      lastEvent: this.lastEvent,
    };
  }
}

export const diagnostics = new LivingDiagnostics();

declare global {
  interface Window {
    __pearlLiving?: { getSnapshot(): LivingSnapshot };
  }
}

if (typeof window !== "undefined") {
  window.__pearlLiving = { getSnapshot: () => diagnostics.getSnapshot() };
}
