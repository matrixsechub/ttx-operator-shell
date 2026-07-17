/**
 * PEARL-SPECTRAL — RECOMMENDATION ENGINE (Track 6, live)
 * ---------------------------------------------------------------------------
 * Governed autonomy core. Consumes the Track 5 runtimes — qualification
 * evidence, tier, resolved entitlements, and the pack-tagged catalog —
 * and produces an ADVISORY recommendation:
 *
 *   { recommendedTier, recommendedPacks, nextAction, voice, justification,
 *     advisor }
 *
 * Doctrine (enforced here, unit-tested):
 *  - ADVISORY ONLY: this module mutates nothing — no grants, no tier
 *    writes. Grants come only from the billing single-writer.
 *  - Option B: never blocks ACCESS; a visitor with no capture gets
 *    "continue-onboarding", never a wall.
 *  - Never recommends BELOW the subject's current tier.
 *  - Every output names the entity that speaks it (EMOTIONAL-ARC):
 *    AURELIUS interprets, GHOST adapts, BEACON recommends, OPERATOR
 *    decides.
 *
 * Endpoint: POST /api/recommendation/evaluate (public; subject resolution
 * identical to the tier worker).
 */

import { CATALOG_ITEMS, type CatalogItem } from "./catalogData";
import {
  PACK_TEMPLATES,
  readEntitlements,
  resolveEntitlements,
  tierRank,
  type EntitlementsEnv,
  type ResolvedEntitlements,
} from "./entitlementsWorker";
import { readTier } from "./tierWorker";
import { readQualificationSnapshot, type QualificationEnv } from "./qualificationRuntime";
import { getAccessTokenOperator, type AuthEnv } from "./auth";
import type { EvidenceItem } from "../src/pearl/qualificationMachine";
import type { QualificationStage, SubscriptionTier, UpgradePackKind } from "../src/pearl/qualificationContract";
import type { EntityName } from "../src/pearl/entityNames";

export type RecommendationEnv = EntitlementsEnv & QualificationEnv & Partial<AuthEnv>;

export type NextAction =
  | "continue-onboarding"
  | "explore-experience"
  | "refine-blueprint"
  | "acquire-pack"
  | "upgrade-tier"
  | "enter-cockpit";

export type PackStatus = "held" | "eligible" | "needs-tier";

export interface RecommendedPack {
  itemId: string;
  name: string;
  kind: UpgradePackKind;
  status: PackStatus;
  minimumTier: SubscriptionTier;
}

export interface UpgradeAdvice {
  eligible: boolean;
  blockedBy: ("tier-prerequisite" | "entitlement-prerequisite")[];
  hint: string;
  voice: EntityName;
}

export interface Recommendation {
  recommendedTier: SubscriptionTier;
  recommendedPacks: RecommendedPack[];
  nextAction: NextAction;
  voice: EntityName;
  justification: string;
  advisor: UpgradeAdvice;
}

export interface RecommendationInputs {
  stage: QualificationStage | null;
  evidence: readonly EvidenceItem[];
  tier: SubscriptionTier;
  resolved: ResolvedEntitlements;
  packItems: readonly CatalogItem[];
}

/** Objective answer → pack families that serve it. */
const OBJECTIVE_PACKS: Record<string, UpgradePackKind[]> = {
  security: ["intelligence-pack", "scenario-pack"],
  efficiency: ["automation-pack"],
  integration: ["automation-pack", "agent-pack"],
  "ai-build": ["agent-pack"],
  other: ["scenario-pack"],
};

function latestAnswer(evidence: readonly EvidenceItem[], questionId: string): string | null {
  let found: string | null = null;
  let foundAt = -1;
  for (const item of evidence) {
    if (item.kind === "answer" && item.data.questionId === questionId && item.at >= foundAt) {
      found = item.data.answer ?? null;
      foundAt = item.at;
    }
  }
  return found;
}

function latestOfKind(evidence: readonly EvidenceItem[], kind: EvidenceItem["kind"]): EvidenceItem | null {
  let found: EvidenceItem | null = null;
  for (const item of evidence) {
    if (item.kind === kind && (!found || item.at >= found.at)) found = item;
  }
  return found;
}

function maxTier(a: SubscriptionTier, b: SubscriptionTier): SubscriptionTier {
  return tierRank(a) >= tierRank(b) ? a : b;
}

export function packItemsFromCatalog(items: readonly CatalogItem[] = CATALOG_ITEMS): CatalogItem[] {
  const kinds = Object.keys(PACK_TEMPLATES);
  return items.filter((item) => item.tags?.some((tag) => kinds.includes(tag)));
}

/** THE engine — pure, advisory, no I/O. */
export function evaluateRecommendation(inputs: RecommendationInputs): Recommendation {
  const { stage, evidence, tier, resolved, packItems } = inputs;

  /* recommended tier: wizard decision > wizard route > heuristic; never
     below current. */
  const decision = latestOfKind(evidence, "upgrade_decision");
  const route = latestOfKind(evidence, "route_shown");
  const teamSize = latestAnswer(evidence, "team_size");
  let candidate: SubscriptionTier;
  if (decision?.data.decision === "accept" && decision.data.tier) {
    candidate = decision.data.tier;
  } else if (route?.data.recommendedTier) {
    candidate = route.data.recommendedTier;
  } else if (teamSize === "org") {
    candidate = "ops-division";
  } else if (stage !== null && stage !== "CAPTURED") {
    candidate = "operator";
  } else {
    candidate = "access";
  }
  const recommendedTier = maxTier(tier, candidate);

  /* recommended packs: objective-matched families minus held grants,
     annotated by what the CURRENT tier makes of them. */
  const objective = latestAnswer(evidence, "objective") ?? "other";
  const families = OBJECTIVE_PACKS[objective] ?? OBJECTIVE_PACKS.other;
  const recommendedPacks: RecommendedPack[] = [];
  for (const item of packItems) {
    const kind = item.tags?.find((tag) => tag in PACK_TEMPLATES) as UpgradePackKind | undefined;
    if (!kind || !families.includes(kind)) continue;
    const template = PACK_TEMPLATES[kind];
    const grant = template.grantFor(item.id);
    const status: PackStatus = resolved.effective.includes(grant)
      ? "held"
      : resolved.latent.some((latent) => latent.grant === grant)
        ? "needs-tier"
        : tierRank(tier) >= tierRank(template.minimumTier)
          ? "eligible"
          : "needs-tier";
    recommendedPacks.push({ itemId: item.id, name: item.name, kind, status, minimumTier: template.minimumTier });
  }

  /* next action ladder. */
  const acquirable = recommendedPacks.some((pack) => pack.status === "eligible");
  const gatedPacks = recommendedPacks.some((pack) => pack.status === "needs-tier");
  const tierBelowRecommendation = tierRank(tier) < tierRank(recommendedTier);
  let nextAction: NextAction;
  if (stage === null || stage === "CAPTURED") {
    nextAction = "continue-onboarding";
  } else if (stage === "EXPERIENCE") {
    nextAction = "explore-experience";
  } else if (stage === "QUALIFY" && !route) {
    nextAction = "refine-blueprint";
  } else if (decision?.data.decision === "accept" && !tierBelowRecommendation) {
    nextAction = "enter-cockpit";
  } else if (tierBelowRecommendation || gatedPacks) {
    nextAction = "upgrade-tier";
  } else if (acquirable) {
    nextAction = "acquire-pack";
  } else {
    nextAction = "enter-cockpit";
  }

  const [voice, justification] = ((): [EntityName, string] => {
    switch (nextAction) {
      case "continue-onboarding":
        return ["aurelius", "The guided path starts with capture — finish onboarding so the system can read your mission."];
      case "explore-experience":
        return ["ghost", "You are inside the trial — the system adapts as you explore governed surfaces."];
      case "refine-blueprint":
        return ["aurelius", "Your answers are recorded but the blueprint is unconfirmed — refine it to unlock a routed recommendation."];
      case "acquire-pack":
        return ["aurelius", `Your ${objective} objective maps to ${recommendedPacks.length} pack(s) your tier can acquire now.`];
      case "upgrade-tier":
        return ["beacon", `Governance recommends ${recommendedTier.toUpperCase()} — it activates what your mission asked for; lower tiers remain available.`];
      case "enter-cockpit":
        return ["operator", "Nothing blocks you — the cockpit is where you decide and the system executes."];
    }
  })();

  /* advisor projection. */
  const blockedBy: UpgradeAdvice["blockedBy"] = [];
  if (tierBelowRecommendation || gatedPacks) blockedBy.push("tier-prerequisite");
  if (!resolved.effective.includes("marketplace.acquire")) blockedBy.push("entitlement-prerequisite");
  const advisor: UpgradeAdvice = {
    eligible: tierBelowRecommendation || gatedPacks,
    blockedBy,
    hint: tierBelowRecommendation
      ? `Upgrading to ${recommendedTier.toUpperCase()} activates the recommendation; ACCESS keeps browsing everything either way.`
      : gatedPacks
        ? "A recommended pack sits above your tier — it stays latent, never lost, until you upgrade."
        : "No upgrade needed for your current mission.",
    voice: "beacon",
  };

  return { recommendedTier, recommendedPacks, nextAction, voice, justification, advisor };
}

/* ── HTTP surface ─────────────────────────────────────────────────────── */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SUBJECT_RE = /^[A-Za-z0-9:_@.-]{1,128}$/;

export async function resolveRecommendationSubject(
  request: Request,
  env: RecommendationEnv,
  body: { subject?: unknown; sessionId?: unknown },
): Promise<string> {
  const operator = await getAccessTokenOperator(request, env as AuthEnv).catch(() => null);
  if (operator?.handle) return operator.handle;
  if (typeof body.subject === "string" && SUBJECT_RE.test(body.subject)) return body.subject;
  if (typeof body.sessionId === "string" && UUID_RE.test(body.sessionId)) {
    return `anon:${body.sessionId.toLowerCase()}`;
  }
  return "anonymous";
}

export async function assembleRecommendation(
  env: RecommendationEnv,
  subject: string,
  captureId: string | null,
): Promise<{ recommendation: Recommendation; stage: QualificationStage | null; tier: SubscriptionTier }> {
  const kv = env.TTX_STATE;
  const tier = await readTier(env, subject);
  const resolved = resolveEntitlements(subject, tier, kv ? await readEntitlements(kv, subject) : null);
  const snapshot = captureId ? await readQualificationSnapshot(env, captureId) : null;
  const recommendation = evaluateRecommendation({
    stage: snapshot?.state?.stage ?? null,
    evidence: snapshot?.evidence ?? [],
    tier,
    resolved,
    packItems: packItemsFromCatalog(),
  });
  return { recommendation, stage: snapshot?.state?.stage ?? null, tier };
}

export async function handleRecommendationRoute(
  request: Request,
  pathname: string,
  env: RecommendationEnv,
): Promise<Response | null> {
  if (pathname !== "/api/recommendation/evaluate") return null;
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405, headers: { Allow: "POST" } });
  }
  if (!env.TTX_STATE) {
    return Response.json({ error: "recommendation storage not configured" }, { status: 503 });
  }

  let body: { captureId?: unknown; sessionId?: unknown; subject?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const captureId = typeof body.captureId === "string" ? body.captureId : null;
  const subject = await resolveRecommendationSubject(request, env, body);
  const { recommendation, stage, tier } = await assembleRecommendation(env, subject, captureId);
  return Response.json({ subject, tier, stage, ...recommendation });
}
