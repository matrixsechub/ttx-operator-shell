/**
 * PEARL-SPECTRAL — QUALIFICATION LIFECYCLE CONTRACT (live since Track 5)
 * ---------------------------------------------------------------------------
 * The type-level contract for the qualification lifecycle. Since Track 5
 * (structural rebuild) this contract is EXECUTED by the pure fold in
 * src/pearl/qualificationMachine.ts and persisted by
 * worker/qualificationRuntime.ts — the contract itself stays type-only so
 * every implementation remains checkable against it.
 *
 * Doctrine encoded here:
 *  - Option B (capture-first → qualification-after) is the default: the
 *    lifecycle begins at CAPTURED. There is no pre-capture stage, by
 *    design — an uncaptured visitor has no lifecycle.
 *  - Stage order is linear and forward-only at the contract level;
 *    whether regression is ever allowed is a Council decision.
 *  - Every stage names the entity that "speaks" while the prospect is in
 *    it, keeping the emotional arc (EMOTIONAL-ARC.md) type-checked.
 */

import type { EntityName } from "./entityNames";

/** Lifecycle stages, in order. Option B: capture is stage zero. */
export const QUALIFICATION_STAGES = [
  "CAPTURED", // minimal identity exists (email + consent) — AURELIUS
  "EXPERIENCE", // prospect explores governed surfaces (trial) — GHOST
  "QUALIFY", // qualification signals gathered after capture — AURELIUS
  "ROUTE", // routed to a service path / tier recommendation — BEACON
  "UPGRADE", // tier or marketplace-pack upgrade decision — OPERATOR
] as const;

export type QualificationStage = (typeof QUALIFICATION_STAGES)[number];

/** Which entity voices each stage (see SURFACE-IDENTITY-MAP.md). */
export const STAGE_VOICE: Record<QualificationStage, EntityName> = {
  CAPTURED: "aurelius",
  EXPERIENCE: "ghost",
  QUALIFY: "aurelius",
  ROUTE: "beacon",
  UPGRADE: "operator",
};

/** Subscription tiers referenced by ROUTE/UPGRADE (UPGRADE-PATH.md). */
export type SubscriptionTier = "access" | "operator" | "ops-division" | "enterprise";

/** Marketplace upgrade pack families (MARKETPLACE-INTEGRATION.md). */
export type UpgradePackKind = "agent-pack" | "automation-pack" | "scenario-pack" | "intelligence-pack";

/**
 * The data each stage is allowed to carry. Note what is absent: no
 * scoring, no routing rules, no persistence keys — those are QUALIFY/
 * ROUTE *implementations* and are out of contract scope.
 */
export interface StagePayloads {
  CAPTURED: {
    /** Capture channel, e.g. "enter-step-1" or "register". */
    source: string;
    consent: boolean;
  };
  EXPERIENCE: {
    /** Surfaces visited during trial, as flow-tracker page paths. */
    surfacesSeen: readonly string[];
  };
  QUALIFY: {
    /** Answers keyed by question id — collection only, never scored here. */
    answers: Readonly<Record<string, string>>;
  };
  ROUTE: {
    /** Recommended service path slug (mission-path picker vocabulary). */
    recommendedPath: string;
    recommendedTier: SubscriptionTier;
  };
  UPGRADE: {
    tier: SubscriptionTier;
    packs: readonly UpgradePackKind[];
  };
}

/** A prospect's position in the lifecycle, as a discriminated union. */
export type QualificationState = {
  [S in QualificationStage]: { stage: S; payload: StagePayloads[S] };
}[QualificationStage];

/**
 * The only transition shape the future machine may implement: one stage
 * forward. Encoded as a type so an implementation that skips stages or
 * moves backward fails to compile against this contract.
 */
export type NextStage<S extends QualificationStage> = S extends "CAPTURED"
  ? "EXPERIENCE"
  : S extends "EXPERIENCE"
    ? "QUALIFY"
    : S extends "QUALIFY"
      ? "ROUTE"
      : S extends "ROUTE"
        ? "UPGRADE"
        : never;
