/**
 * PEARL-SPECTRAL — BLUEPRINT GENERATOR (Track 6, live)
 * ---------------------------------------------------------------------------
 * Assembles the durable operator blueprint for a captured prospect from
 * the qualification snapshot + recommendation engine:
 *
 *   { mission, objective, recommendedPacks, recommendedTier, nextSteps }
 *
 * The blueprint is a READ — it derives entirely from evidence and the
 * advisory engine; it never mutates lifecycle, tier, or grants.
 *
 * Endpoint: GET /api/blueprint?captureId=… (public, capture-anchored —
 * 404 for unknown captures, `blueprint: null` before the lifecycle has
 * enough evidence to say anything).
 */

import {
  assembleRecommendation,
  resolveRecommendationSubject,
  type NextAction,
  type RecommendationEnv,
} from "./recommendationEngine";
import { readQualificationSnapshot } from "./qualificationRuntime";
import type { EvidenceItem } from "../src/pearl/qualificationMachine";

const CAPTURE_ID_RE = /^[A-Za-z0-9_-]{6,128}$/;

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

function latestRoute(evidence: readonly EvidenceItem[]): { path: string } | null {
  let found: { path: string } | null = null;
  let foundAt = -1;
  for (const item of evidence) {
    if (item.kind === "route_shown" && item.data.recommendedPath && item.at >= foundAt) {
      found = { path: item.data.recommendedPath };
      foundAt = item.at;
    }
  }
  return found;
}

const NEXT_STEPS: Record<NextAction, string[]> = {
  "continue-onboarding": ["Finish the onboarding wizard at /onboarding", "Confirm your mission blueprint"],
  "explore-experience": ["Explore the marketplace and TTX join surfaces", "Answer the objective questions to unlock routing"],
  "refine-blueprint": ["Return to /onboarding to confirm your blueprint", "Review the recommended mission path"],
  "acquire-pack": ["Acquire the recommended pack(s) from the marketplace", "Review your resolved entitlements"],
  "upgrade-tier": ["Review the recommended tier with the upgrade advisor", "Latent packs activate automatically on upgrade"],
  "enter-cockpit": ["Authenticate at /login", "Enter the operator cockpit"],
};

export async function handleBlueprintRoute(
  request: Request,
  pathname: string,
  env: RecommendationEnv,
): Promise<Response | null> {
  if (pathname !== "/api/blueprint") return null;
  if (request.method !== "GET") {
    return Response.json({ error: "Method not allowed" }, { status: 405, headers: { Allow: "GET" } });
  }
  if (!env.TTX_STATE) {
    return Response.json({ error: "blueprint storage not configured" }, { status: 503 });
  }

  const url = new URL(request.url);
  const captureId = url.searchParams.get("captureId") ?? "";
  if (!CAPTURE_ID_RE.test(captureId)) {
    return Response.json({ error: "captureId is invalid" }, { status: 400 });
  }

  const snapshot = await readQualificationSnapshot(env, captureId);
  if (!snapshot) {
    return Response.json({ error: "capture not found" }, { status: 404 });
  }

  const subject = await resolveRecommendationSubject(request, env, {
    sessionId: url.searchParams.get("sessionId") ?? undefined,
  });
  const { recommendation, stage } = await assembleRecommendation(env, subject, captureId);

  if (!snapshot.state) {
    return Response.json({
      captureId,
      stage: null,
      blueprint: null,
      nextSteps: NEXT_STEPS["continue-onboarding"],
      voice: "aurelius",
    });
  }

  const mission = latestRoute(snapshot.evidence)?.path ?? null;
  const objective = latestAnswer(snapshot.evidence, "objective");

  return Response.json({
    captureId,
    stage,
    blueprint: {
      mission,
      objective,
      recommendedPacks: recommendation.recommendedPacks,
      recommendedTier: recommendation.recommendedTier,
      nextSteps: NEXT_STEPS[recommendation.nextAction],
    },
    voice: recommendation.voice,
    justification: recommendation.justification,
  });
}
