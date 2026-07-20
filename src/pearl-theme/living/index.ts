/**
 * PEARL LIVING LAYER — public barrel.
 * Import `./living.css` alongside the pearl theme to activate the ambient CSS.
 */
export { LivingRoot } from "./LivingRoot";
export { LivingContext, useLiving, type LivingContextValue } from "./LivingContext";
export { LivingGlassPanel, LivingGoldButton, LivingTelemetryCard } from "./wrappers";
export { MOTION_POLICY } from "./policy";
export { diagnostics, type LivingSnapshot, type LivingState } from "./diagnostics";
export {
  usePointerHalo,
  usePanelParallax,
  useGoldRipple,
  useGhostMotes,
  useValueHeartbeat,
} from "./behaviors";
export { useReducedMotion, useDocumentVisibility, useInView } from "./useEnvironment";
