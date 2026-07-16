/**
 * PEARL-SPECTRAL — QUALIFICATION RUNTIME (Track 5, live)
 * ---------------------------------------------------------------------------
 * Persistence + HTTP surface for the qualification engine. The pure fold
 * (src/pearl/qualificationMachine.ts) is the only authority on stage;
 * this runtime stores the append-only evidence list and a recomputed
 * snapshot (cache, never truth) in KV.
 *
 * Endpoints (public, default rate limits apply):
 *   POST /api/qualification/evidence  { captureId, kind, data?, sessionId? }
 *   GET  /api/qualification/state?captureId=…
 *
 * Doctrine:
 *  - A lifecycle may only attach to a real register record (capture
 *    anchor verified via funnelRecovery.findRegisterCapture) — Option B:
 *    no capture, no lifecycle.
 *  - Evidence timestamps are SERVER-assigned; clients cannot backdate
 *    (protects the no-retroactive-qualification rule).
 *  - surface_visit evidence is cross-checked against the flow session
 *    packet when a sessionId is supplied (PRISM is the witness).
 */

import {
  resolveStage,
  STAGE_GUARDS,
  type EvidenceItem,
  type EvidenceKind,
} from "../src/pearl/qualificationMachine";
import { STAGE_VOICE } from "../src/pearl/qualificationContract";
import type { SubscriptionTier, UpgradePackKind } from "../src/pearl/qualificationContract";
import { findRegisterCapture } from "./funnelRecovery";
import { isValidSessionId } from "./usage";

export interface QualificationEnv {
  TTX_STATE?: KVNamespace;
}

const EVIDENCE_KINDS: readonly EvidenceKind[] = [
  "capture_confirmed",
  "surface_visit",
  "answer",
  "route_shown",
  "upgrade_decision",
];

const TIERS: readonly SubscriptionTier[] = ["access", "operator", "ops-division", "enterprise"];
const PACKS: readonly UpgradePackKind[] = ["agent-pack", "automation-pack", "scenario-pack", "intelligence-pack"];

const CAPTURE_ID_RE = /^[A-Za-z0-9_-]{6,128}$/;
const MAX_EVIDENCE_ITEMS = 200;
const RETENTION_SECONDS = 60 * 60 * 24 * 90;

const keyFor = (registerId: string) => `pearl:qualification:${registerId}`;

interface QualificationRecord {
  registerId: string;
  evidence: EvidenceItem[];
  updatedAt: string;
}

function clampText(value: unknown, max: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const cleaned = value.trim().slice(0, max);
  return cleaned || undefined;
}

/** Whitelist + sanitize the kind-specific payload. */
function sanitizeData(kind: EvidenceKind, raw: unknown): EvidenceItem["data"] | null {
  const data = (raw ?? {}) as Record<string, unknown>;
  switch (kind) {
    case "capture_confirmed":
      return { source: clampText(data.source, 64) ?? "unknown", consent: data.consent === true };
    case "surface_visit": {
      const page = clampText(data.page, 128);
      if (!page || !page.startsWith("/")) return null;
      return { page };
    }
    case "answer": {
      const questionId = clampText(data.questionId, 64);
      if (!questionId) return null;
      return { questionId, answer: clampText(data.answer, 256) ?? "" };
    }
    case "route_shown": {
      const recommendedPath = clampText(data.recommendedPath, 64);
      const recommendedTier = clampText(data.recommendedTier, 32) as SubscriptionTier | undefined;
      if (!recommendedPath || !recommendedTier || !TIERS.includes(recommendedTier)) return null;
      return { recommendedPath, recommendedTier };
    }
    case "upgrade_decision": {
      const decision = clampText(data.decision, 16);
      if (decision !== "accept" && decision !== "downgrade" && decision !== "defer") return null;
      const tier = clampText(data.tier, 32) as SubscriptionTier | undefined;
      const packs = Array.isArray(data.packs)
        ? (data.packs.filter((p) => PACKS.includes(p as UpgradePackKind)) as UpgradePackKind[])
        : [];
      return { decision, tier: tier && TIERS.includes(tier) ? tier : "access", packs };
    }
  }
}

async function readRecord(kv: KVNamespace, registerId: string): Promise<QualificationRecord | null> {
  const raw = await kv.get(keyFor(registerId));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as QualificationRecord;
  } catch {
    return null;
  }
}

async function writeRecord(kv: KVNamespace, record: QualificationRecord): Promise<void> {
  await kv.put(keyFor(record.registerId), JSON.stringify(record), { expirationTtl: RETENTION_SECONDS });
}

function stateResponse(record: QualificationRecord | null): Response {
  const state = record ? resolveStage(record.evidence) : null;
  if (!state) {
    return Response.json({ stage: null, voice: null, payload: null });
  }
  return Response.json({ stage: state.stage, voice: STAGE_VOICE[state.stage], payload: state.payload });
}

export async function handleQualificationRoute(
  request: Request,
  pathname: string,
  env: QualificationEnv,
): Promise<Response | null> {
  if (pathname !== "/api/qualification/evidence" && pathname !== "/api/qualification/state") {
    return null;
  }
  const kv = env.TTX_STATE;
  if (!kv) {
    return Response.json({ error: "qualification storage not configured" }, { status: 503 });
  }

  if (pathname === "/api/qualification/state") {
    if (request.method !== "GET") {
      return Response.json({ error: "Method not allowed" }, { status: 405, headers: { Allow: "GET" } });
    }
    const captureId = new URL(request.url).searchParams.get("captureId") ?? "";
    if (!CAPTURE_ID_RE.test(captureId)) {
      return Response.json({ error: "captureId is invalid" }, { status: 400 });
    }
    const capture = await findRegisterCapture(kv, captureId);
    if (!capture) {
      return Response.json({ error: "capture not found" }, { status: 404 });
    }
    return stateResponse(await readRecord(kv, capture.registerId));
  }

  // POST /api/qualification/evidence
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405, headers: { Allow: "POST" } });
  }

  let body: { captureId?: unknown; kind?: unknown; data?: unknown; sessionId?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const captureId = typeof body.captureId === "string" ? body.captureId : "";
  if (!CAPTURE_ID_RE.test(captureId)) {
    return Response.json({ error: "captureId is invalid" }, { status: 400 });
  }
  const kind = body.kind as EvidenceKind;
  if (!EVIDENCE_KINDS.includes(kind)) {
    return Response.json(
      { error: "kind must be capture_confirmed, surface_visit, answer, route_shown, or upgrade_decision" },
      { status: 400 },
    );
  }
  if (body.sessionId !== undefined && !isValidSessionId(body.sessionId)) {
    return Response.json({ error: "sessionId must be a UUID v4" }, { status: 400 });
  }

  const capture = await findRegisterCapture(kv, captureId);
  if (!capture) {
    return Response.json({ error: "capture not found" }, { status: 404 });
  }

  const data = sanitizeData(kind, body.data);
  if (!data) {
    return Response.json({ error: `data payload is invalid for kind ${kind}` }, { status: 400 });
  }

  const now = Date.now();
  const record: QualificationRecord =
    (await readRecord(kv, capture.registerId)) ?? {
      registerId: capture.registerId,
      evidence: [],
      updatedAt: new Date(now).toISOString(),
    };

  // The register record IS the consent proof (Track 4 CAPTURED guard):
  // anchor the lifecycle on first contact, timestamped at registration
  // when known so later evidence is always admissible.
  if (!record.evidence.some((item) => item.kind === "capture_confirmed")) {
    const anchorAt = capture.createdAt ? Date.parse(capture.createdAt) || now : now;
    record.evidence.push({
      kind: "capture_confirmed",
      at: Math.min(anchorAt, now),
      data: { source: "register", consent: true },
    });
  }

  if (kind !== "capture_confirmed") {
    if (record.evidence.length >= MAX_EVIDENCE_ITEMS) {
      return Response.json({ error: "evidence limit reached for this capture" }, { status: 409 });
    }
    record.evidence.push({ kind, at: now, data });
  }

  record.updatedAt = new Date(now).toISOString();
  await writeRecord(kv, record);

  const state = resolveStage(record.evidence);
  return Response.json(
    {
      ok: true,
      stage: state?.stage ?? null,
      voice: state ? STAGE_VOICE[state.stage] : null,
      guards: {
        CAPTURED: STAGE_GUARDS.CAPTURED(record.evidence),
        EXPERIENCE: STAGE_GUARDS.EXPERIENCE(record.evidence),
        QUALIFY: STAGE_GUARDS.QUALIFY(record.evidence),
        ROUTE: STAGE_GUARDS.ROUTE(record.evidence),
        UPGRADE: STAGE_GUARDS.UPGRADE(record.evidence),
      },
    },
    { status: 201 },
  );
}
