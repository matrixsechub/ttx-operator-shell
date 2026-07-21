/**
 * PEARL-SPECTRAL — QUALIFICATION MACHINE (Track 5, live)
 * ---------------------------------------------------------------------------
 * The pure executor over the type-level contract (qualificationContract.ts)
 * and the Track 4 runtime contract (QUALIFICATION-RUNTIME.md):
 *
 *   CAPTURED → EXPERIENCE → QUALIFY → ROUTE → UPGRADE
 *
 * Design rules (all enforced here, unit-tested in
 * tests/qualificationMachine.test.ts):
 *  - PURE: no I/O, no clock reads, no randomness. Stage is a replayable
 *    fold over an append-only evidence list — the runtime persists
 *    snapshots as a cache, never as truth.
 *  - Forward-only, no skipping: each stage guard requires the previous
 *    stage's guard; evidence for a later stage without the earlier
 *    stages' evidence does not advance anything.
 *  - Absence of evidence means the EARLIER stage (never optimistic).
 *  - Evidence timestamped before the capture record is ignored
 *    (no retroactive qualification).
 */

import {
  QUALIFICATION_STAGES,
  STAGE_VOICE,
  type QualificationStage,
  type QualificationState,
  type SubscriptionTier,
  type UpgradePackKind,
} from "./qualificationContract";

/** Evidence kinds — mirrors the Track 4 evidence-gate table. */
export type EvidenceKind =
  | "capture_confirmed" // register record exists + consent (→ CAPTURED)
  | "surface_visit" // governed-surface page_view after capture (→ EXPERIENCE)
  | "answer" // qualification answer stored (→ QUALIFY)
  | "route_shown" // recommendation rendered to the prospect (→ ROUTE)
  | "upgrade_decision"; // explicit accept/downgrade/defer (→ UPGRADE)

export interface EvidenceItem {
  kind: EvidenceKind;
  /** Epoch ms. Items earlier than the capture_confirmed item are ignored. */
  at: number;
  /** Kind-specific payload (validated by the runtime before storage). */
  data: {
    source?: string;
    consent?: boolean;
    page?: string;
    questionId?: string;
    answer?: string;
    recommendedPath?: string;
    recommendedTier?: SubscriptionTier;
    decision?: "accept" | "downgrade" | "defer";
    tier?: SubscriptionTier;
    packs?: UpgradePackKind[];
  };
}

const STAGE_ORDER: readonly QualificationStage[] = QUALIFICATION_STAGES;

export function stageIndex(stage: QualificationStage): number {
  return STAGE_ORDER.indexOf(stage);
}

/** The capture anchor: earliest consented capture_confirmed item. */
function captureAnchor(evidence: readonly EvidenceItem[]): EvidenceItem | null {
  let anchor: EvidenceItem | null = null;
  for (const item of evidence) {
    if (item.kind !== "capture_confirmed" || item.data.consent !== true) continue;
    if (!anchor || item.at < anchor.at) anchor = item;
  }
  return anchor;
}

/** Evidence admissible under the no-retroactive-qualification rule. */
function admissible(evidence: readonly EvidenceItem[], anchor: EvidenceItem): EvidenceItem[] {
  return evidence.filter((item) => item.at >= anchor.at);
}

/**
 * Stage guards — each requires the previous guard (no skipping). Exported
 * individually so surfaces can ask "may I render stage X?" without
 * re-deriving the fold.
 */
export const STAGE_GUARDS: Record<QualificationStage, (evidence: readonly EvidenceItem[]) => boolean> = {
  CAPTURED: (evidence) => captureAnchor(evidence) !== null,

  EXPERIENCE: (evidence) => {
    const anchor = captureAnchor(evidence);
    if (!anchor) return false;
    return admissible(evidence, anchor).some((item) => item.kind === "surface_visit");
  },

  QUALIFY: (evidence) => {
    if (!STAGE_GUARDS.EXPERIENCE(evidence)) return false;
    const anchor = captureAnchor(evidence);
    if (!anchor) return false;
    return admissible(evidence, anchor).some((item) => item.kind === "answer" && !!item.data.questionId);
  },

  ROUTE: (evidence) => {
    if (!STAGE_GUARDS.QUALIFY(evidence)) return false;
    const anchor = captureAnchor(evidence);
    if (!anchor) return false;
    return admissible(evidence, anchor).some(
      (item) => item.kind === "route_shown" && !!item.data.recommendedPath && !!item.data.recommendedTier,
    );
  },

  UPGRADE: (evidence) => {
    if (!STAGE_GUARDS.ROUTE(evidence)) return false;
    const anchor = captureAnchor(evidence);
    if (!anchor) return false;
    return admissible(evidence, anchor).some((item) => item.kind === "upgrade_decision" && !!item.data.decision);
  },
};

function latest<K extends EvidenceKind>(
  evidence: readonly EvidenceItem[],
  kind: K,
): EvidenceItem | undefined {
  let found: EvidenceItem | undefined;
  for (const item of evidence) {
    if (item.kind !== kind) continue;
    if (!found || item.at >= found.at) found = item;
  }
  return found;
}

/**
 * The fold: highest stage whose guard (and all earlier guards, by
 * construction) holds. Returns null when not even CAPTURED holds — a
 * prospect without consented capture has no lifecycle (Option B).
 */
export function resolveStage(evidence: readonly EvidenceItem[]): QualificationState | null {
  const anchor = captureAnchor(evidence);
  if (!anchor) return null;
  const scoped = admissible(evidence, anchor);

  let stage: QualificationStage = "CAPTURED";
  for (const candidate of STAGE_ORDER) {
    if (STAGE_GUARDS[candidate](evidence)) stage = candidate;
    else break; // forward-only: first failed guard ends the fold
  }

  switch (stage) {
    case "CAPTURED":
      return {
        stage,
        payload: { source: anchor.data.source ?? "unknown", consent: true },
      };
    case "EXPERIENCE": {
      const pages = new Set<string>();
      for (const item of scoped) {
        if (item.kind === "surface_visit" && item.data.page) pages.add(item.data.page);
      }
      return { stage, payload: { surfacesSeen: [...pages] } };
    }
    case "QUALIFY": {
      const answers: Record<string, string> = {};
      for (const item of scoped) {
        if (item.kind === "answer" && item.data.questionId) {
          answers[item.data.questionId] = item.data.answer ?? "";
        }
      }
      return { stage, payload: { answers } };
    }
    case "ROUTE": {
      const shown = latest(scoped, "route_shown");
      return {
        stage,
        payload: {
          recommendedPath: shown?.data.recommendedPath ?? "unknown",
          recommendedTier: shown?.data.recommendedTier ?? "access",
        },
      };
    }
    case "UPGRADE": {
      const decision = latest(scoped, "upgrade_decision");
      return {
        stage,
        payload: {
          tier: decision?.data.tier ?? "access",
          packs: decision?.data.packs ?? [],
        },
      };
    }
  }
}

/** Voice for a resolved state (SURFACE-IDENTITY-MAP / EMOTIONAL-ARC binding). */
export function stageVoice(state: QualificationState): (typeof STAGE_VOICE)[QualificationStage] {
  return STAGE_VOICE[state.stage];
}
