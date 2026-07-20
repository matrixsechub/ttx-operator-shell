/**
 * PEARL LIVING LAYER — runtime context
 * ---------------------------------------------------------------------------
 * Exposes the derived Living state and the single `shouldAnimate` gate to
 * wrapper components/hooks. State is one of: active | offscreen | hidden |
 * reduced | unmounted. Only `active` permits decorative motion.
 */

import { createContext, useContext } from "react";
import type { LivingState } from "./diagnostics";

export interface LivingContextValue {
  state: LivingState;
  /** True only when state === "active" (visible, in view, not reduced, mounted). */
  shouldAnimate: boolean;
}

export const LivingContext = createContext<LivingContextValue>({
  state: "unmounted",
  shouldAnimate: false,
});

export function useLiving(): LivingContextValue {
  return useContext(LivingContext);
}
