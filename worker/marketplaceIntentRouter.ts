/**
 * PEARL-SPECTRAL — MARKETPLACE INTENT ROUTER (Track 6, live)
 * ---------------------------------------------------------------------------
 * Turns a visitor's marketplace intent plus the recommendation engine's
 * output into ONE governed route:
 *
 *   acquire + eligible item   → m3-purchase           (AURELIUS)
 *   acquire + tier-gated      → tier-upgrade          (BEACON)
 *   upgrade                   → tier-upgrade          (BEACON)
 *   refine                    → blueprint-refinement  (AURELIUS)
 *   continue / no capture     → onboarding-continuation (AURELIUS)
 *
 * Option B: routing is advisory navigation — nothing here mutates tier or
 * grants, and no intent ever locks the catalog. When a captureId is
 * supplied the intent is recorded as qualification evidence
 * (answer:marketplace_intent) so interest enriches the already-captured
 * lead. Every routed intent emits a marketplace-intent notification.
 *
 * Endpoint: POST /api/marketplace/intent (public, validated).
 */

import { CATALOG_ITEMS } from "./catalogData";
import { packKindFromTags, PACK_TEMPLATES, tierRank } from "./entitlementsWorker";
import { readTier } from "./tierWorker";
import {
  assembleRecommendation,
  resolveRecommendationSubject,
  type RecommendationEnv,
} from "./recommendationEngine";
import { handleQualificationRoute } from "./qualificationRuntime";
import { notifyOperator, type NotificationsEnv } from "./operatorNotifications";
import type { EntityName } from "../src/pearl/entityNames";

export type IntentKind = "acquire" | "upgrade" | "refine" | "continue";
export type IntentRoute = "m3-purchase" | "tier-upgrade" | "blueprint-refinement" | "onboarding-continuation";

const INTENTS: readonly IntentKind[] = ["acquire", "upgrade", "refine", "continue"];

export interface IntentDecision {
  route: IntentRoute;
  target: string;
  voice: EntityName;
  reason: string;
  requiresTier?: string;
}

type IntentEnv = RecommendationEnv & NotificationsEnv;

async function recordIntentEvidence(env: IntentEnv, captureId: string, intent: IntentKind, itemId: string | null) {
  // Reuse the qualification runtime's own validation path rather than
  // duplicating its KV/anchor logic.
  const body = JSON.stringify({
    captureId,
    kind: "answer",
    data: { questionId: "marketplace_intent", answer: itemId ? `${intent}:${itemId}` : intent },
  });
  await handleQualificationRoute(
    new Request("https://internal/api/qualification/evidence", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    }),
    "/api/qualification/evidence",
    env,
  );
}

export async function handleMarketplaceIntentRoute(
  request: Request,
  pathname: string,
  env: IntentEnv,
): Promise<Response | null> {
  if (pathname !== "/api/marketplace/intent") return null;
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405, headers: { Allow: "POST" } });
  }
  if (!env.TTX_STATE) {
    return Response.json({ error: "intent storage not configured" }, { status: 503 });
  }

  let body: { intent?: unknown; itemId?: unknown; captureId?: unknown; sessionId?: unknown; subject?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const intent = body.intent as IntentKind;
  if (!INTENTS.includes(intent)) {
    return Response.json({ error: "intent must be acquire, upgrade, refine, or continue" }, { status: 400 });
  }
  const itemId = typeof body.itemId === "string" ? body.itemId.trim() : null;
  const captureId = typeof body.captureId === "string" ? body.captureId : null;

  const subject = await resolveRecommendationSubject(request, env, body);
  const { recommendation, stage } = await assembleRecommendation(env, subject, captureId);
  const tier = await readTier(env, subject);

  let decision: IntentDecision;

  if (intent === "acquire" && itemId) {
    const item = CATALOG_ITEMS.find((candidate) => candidate.id === itemId);
    const kind = item ? packKindFromTags(item.tags) : null;
    if (!item || !kind) {
      return Response.json({ error: "itemId is not an acquirable pack" }, { status: 404 });
    }
    const minimumTier = PACK_TEMPLATES[kind].minimumTier;
    if (tierRank(tier) >= tierRank(minimumTier)) {
      decision = {
        route: "m3-purchase",
        target: item.id,
        voice: "aurelius",
        reason: `${item.name} is acquirable at your tier — routing to the purchase flow.`,
      };
    } else {
      decision = {
        route: "tier-upgrade",
        target: minimumTier,
        requiresTier: minimumTier,
        voice: "beacon",
        reason: `${item.name} requires ${minimumTier.toUpperCase()}; browsing stays open at every tier.`,
      };
    }
  } else if (intent === "acquire") {
    return Response.json({ error: "acquire intent requires itemId" }, { status: 400 });
  } else if (intent === "upgrade") {
    decision = {
      route: "tier-upgrade",
      target: recommendation.recommendedTier,
      requiresTier: recommendation.recommendedTier,
      voice: "beacon",
      reason: recommendation.advisor.hint,
    };
  } else if (intent === "refine") {
    decision = {
      route: "blueprint-refinement",
      target: "/onboarding",
      voice: "aurelius",
      reason: "Refining the blueprint re-opens the guided path with your answers preserved.",
    };
  } else {
    decision = {
      route: "onboarding-continuation",
      target: "/onboarding",
      voice: "aurelius",
      reason:
        stage === null
          ? "No capture yet — onboarding starts the lifecycle (capture first, questions after)."
          : "Onboarding continues from the stage your evidence already proves.",
    };
  }

  // No capture at all always routes to onboarding continuation (Option B),
  // except a plain eligible acquire, which never requires a lifecycle.
  if (!captureId && intent !== "acquire") {
    decision = {
      route: "onboarding-continuation",
      target: "/onboarding",
      voice: "aurelius",
      reason: "No capture yet — onboarding starts the lifecycle (capture first, questions after).",
    };
  }

  if (captureId) {
    await recordIntentEvidence(env, captureId, intent, itemId);
  }

  await notifyOperator(env, {
    kind: "marketplace-intent",
    subject,
    captureId: captureId ?? undefined,
    data: { intent, itemId, route: decision.route },
  });

  return Response.json({ subject, tier, intent, ...decision, nextAction: recommendation.nextAction });
}
