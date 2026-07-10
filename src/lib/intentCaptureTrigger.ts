export const INTENT_TRIGGER_DWELL_MS = 25_000;
export const INTENT_TRIGGER_SCROLL_DEPTH = 0.5;
export const INTENT_TRIGGER_MIN_CLICKS = 2;

export interface IntentTriggerState {
  dwellMs: number;
  scrollDepth: number;
  clicks: number;
  frictionOnPage: boolean;
  weakExperimentIntent: boolean;
  pageLoadedAt: number;
}

export function evaluateIntentCaptureTrigger(state: IntentTriggerState): boolean {
  if (Date.now() - state.pageLoadedAt < 3_000) return false;
  return (
    state.clicks >= INTENT_TRIGGER_MIN_CLICKS ||
    state.dwellMs > INTENT_TRIGGER_DWELL_MS ||
    state.scrollDepth > INTENT_TRIGGER_SCROLL_DEPTH ||
    state.frictionOnPage ||
    state.weakExperimentIntent
  );
}
