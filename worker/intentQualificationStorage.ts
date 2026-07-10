import {
  INTENT_QUALIFICATION_BATCH_LIMIT,
  INTENT_QUALIFICATION_LOG_MAX,
  INTENT_QUALIFICATION_ROLLUP_TTL_SECONDS,
  INTENT_QUALIFICATION_TTL_SECONDS,
  emptyQualificationRollup,
  type IntentQualificationAdvisoryProposal,
  type IntentQualificationRecord,
  type IntentQualificationRollup,
  type QualifyBatchResult,
} from "./intentQualificationTypes";
import {
  buildAdvisoryProposals,
  mergeRollupWithQualification,
  qualifyCapturedIntent,
} from "./intentQualification";
import {
  getIntentCaptureLog,
  readIntentCaptureByCaptureId,
  type IntentCaptureStorageEnv,
} from "./intentCaptureStorage";
import type { IntentCaptureRecord } from "./intentCaptureTypes";
import { recordIntentQualificationTelemetry } from "./intentQualificationTelemetry";
import { resolveTelemetryEnvironment, type ModeEnv } from "./mode";
import type { TelemetryContextEnv } from "./telemetry";

export interface IntentQualificationStorageEnv extends IntentCaptureStorageEnv, TelemetryContextEnv, ModeEnv {
  TTX_STATE: KVNamespace;
  DEPLOY_ENV?: string;
}

const ROLLUP_KEY = "intent:qualification:rollup:v1";
const LOG_KEY = "intent:qualification:log";
const PROPOSALS_KEY = "intent:qualification:proposals:v1";

function qualificationKey(captureId: string): string {
  return `intent:qualification:${captureId}`;
}

function typeIndexKey(intentType: string): string {
  return `intent:qualification:type:${intentType}`;
}

function priorityIndexKey(priority: string): string {
  return `intent:qualification:priority:${priority}`;
}

function incrementIndexKey(env: IntentQualificationStorageEnv, key: string): Promise<void> {
  return env.TTX_STATE.get(key).then((raw) => {
    const next = (raw ? Number(raw) : 0) + 1;
    return env.TTX_STATE.put(key, String(Number.isFinite(next) ? next : 1), {
      expirationTtl: INTENT_QUALIFICATION_ROLLUP_TTL_SECONDS,
    });
  });
}

async function readRollup(env: IntentQualificationStorageEnv): Promise<IntentQualificationRollup> {
  const raw = await env.TTX_STATE.get(ROLLUP_KEY);
  if (!raw) return emptyQualificationRollup();
  try {
    return JSON.parse(raw) as IntentQualificationRollup;
  } catch {
    return emptyQualificationRollup();
  }
}

async function writeRollup(env: IntentQualificationStorageEnv, rollup: IntentQualificationRollup): Promise<void> {
  rollup.updatedAt = new Date().toISOString();
  await env.TTX_STATE.put(ROLLUP_KEY, JSON.stringify(rollup), {
    expirationTtl: INTENT_QUALIFICATION_ROLLUP_TTL_SECONDS,
  });
}

async function readQualificationLog(env: IntentQualificationStorageEnv): Promise<IntentQualificationRecord[]> {
  const raw = await env.TTX_STATE.get(LOG_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as IntentQualificationRecord[];
  } catch {
    return [];
  }
}

async function writeQualificationLog(
  env: IntentQualificationStorageEnv,
  records: IntentQualificationRecord[],
): Promise<void> {
  await env.TTX_STATE.put(LOG_KEY, JSON.stringify(records.slice(0, INTENT_QUALIFICATION_LOG_MAX)), {
    expirationTtl: INTENT_QUALIFICATION_ROLLUP_TTL_SECONDS,
  });
}

async function readProposals(env: IntentQualificationStorageEnv): Promise<IntentQualificationAdvisoryProposal[]> {
  const raw = await env.TTX_STATE.get(PROPOSALS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as IntentQualificationAdvisoryProposal[];
  } catch {
    return [];
  }
}

async function writeProposals(
  env: IntentQualificationStorageEnv,
  proposals: IntentQualificationAdvisoryProposal[],
): Promise<void> {
  const deduped = new Map<string, IntentQualificationAdvisoryProposal>();
  for (const proposal of proposals) {
    deduped.set(proposal.id, proposal);
  }
  await env.TTX_STATE.put(PROPOSALS_KEY, JSON.stringify([...deduped.values()].slice(0, 50)), {
    expirationTtl: INTENT_QUALIFICATION_ROLLUP_TTL_SECONDS,
  });
}

export async function readQualificationByCaptureId(
  env: IntentQualificationStorageEnv,
  captureId: string,
): Promise<IntentQualificationRecord | null> {
  const raw = await env.TTX_STATE.get(qualificationKey(captureId));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as IntentQualificationRecord;
  } catch {
    return null;
  }
}

async function persistQualification(
  env: IntentQualificationStorageEnv,
  record: IntentQualificationRecord,
  rollup: IntentQualificationRollup,
  proposals: IntentQualificationAdvisoryProposal[],
  options: { isNew: boolean },
): Promise<void> {
  const log = await readQualificationLog(env);
  const without = log.filter((entry) => entry.captureId !== record.captureId);
  without.unshift(record);

  const writes: Promise<unknown>[] = [
    env.TTX_STATE.put(qualificationKey(record.captureId), JSON.stringify(record), {
      expirationTtl: INTENT_QUALIFICATION_TTL_SECONDS,
    }),
    writeRollup(env, rollup),
    writeQualificationLog(env, without),
    writeProposals(env, proposals),
  ];

  if (options.isNew) {
    writes.push(
      incrementIndexKey(env, typeIndexKey(record.classification.intentType)),
      incrementIndexKey(env, priorityIndexKey(record.priority)),
    );
  }

  await Promise.all(writes);
}

async function emitQualificationTelemetry(
  env: IntentQualificationStorageEnv,
  record: IntentQualificationRecord,
  event: "intent_qualification_completed" | "intent_routed" | "intent_operator_review_required",
): Promise<void> {
  const environment = env.DEPLOY_ENV ?? resolveTelemetryEnvironment(env);
  const base = {
    captureId: record.captureId,
    intentType: record.classification.intentType,
    priority: record.priority,
    recommendedRoute: record.routing.recommendedRoute,
    environment,
    testRunId: record.testRunId,
    timestamp: new Date().toISOString(),
  };

  await recordIntentQualificationTelemetry(env, event, base);
  await recordIntentQualificationTelemetry(env, "intent_routed", base);

  if (record.routing.routeKind === "operator_review") {
    await recordIntentQualificationTelemetry(env, "intent_operator_review_required", base);
  }

  if (record.proposalIds.length > 0) {
    await recordIntentQualificationTelemetry(env, "qualification_proposal_generated", base);
  }
}

export async function qualifyCaptureById(
  env: IntentQualificationStorageEnv,
  captureId: string,
): Promise<{ record: IntentQualificationRecord | null; created: boolean }> {
  const existing = await readQualificationByCaptureId(env, captureId);
  if (existing) return { record: existing, created: false };

  const capture = await readIntentCaptureByCaptureId(env, captureId);
  if (!capture) return { record: null, created: false };

  const record = await qualifyAndPersist(env, capture);
  return { record, created: true };
}

async function qualifyAndPersist(
  env: IntentQualificationStorageEnv,
  capture: IntentCaptureRecord,
): Promise<IntentQualificationRecord> {
  await recordIntentQualificationTelemetry(env, "intent_qualification_started", {
    captureId: capture.captureId,
    environment: env.DEPLOY_ENV ?? resolveTelemetryEnvironment(env),
    testRunId: capture.experimentId?.startsWith("intent-qualification-")
      ? capture.experimentId
      : undefined,
    timestamp: new Date().toISOString(),
  });

  const rollup = await readRollup(env);
  const qualified = qualifyCapturedIntent(capture);
  const proposalsForRecord = buildAdvisoryProposals(qualified, rollup);
  qualified.proposalIds = proposalsForRecord.map((proposal) => proposal.id);

  const nextRollup = mergeRollupWithQualification(rollup, qualified);
  const existingProposals = await readProposals(env);
  const mergedProposals = [...proposalsForRecord, ...existingProposals];

  await persistQualification(env, qualified, nextRollup, mergedProposals, { isNew: true });
  await emitQualificationTelemetry(env, qualified, "intent_qualification_completed");
  return qualified;
}

export async function qualifyCaptureBatch(
  env: IntentQualificationStorageEnv,
  options?: { limit?: number },
): Promise<QualifyBatchResult> {
  const limit = Math.min(options?.limit ?? INTENT_QUALIFICATION_BATCH_LIMIT, INTENT_QUALIFICATION_BATCH_LIMIT);
  const captures = await getIntentCaptureLog(env);
  const qualified: IntentQualificationRecord[] = [];
  let processed = 0;
  let skipped = 0;
  let failed = 0;

  for (const capture of captures.slice(0, limit)) {
    const existing = await readQualificationByCaptureId(env, capture.captureId);
    if (existing) {
      qualified.push(existing);
      skipped += 1;
      continue;
    }

    try {
      qualified.push(await qualifyAndPersist(env, capture));
      processed += 1;
    } catch {
      failed += 1;
      await recordIntentQualificationTelemetry(env, "intent_qualification_failed", {
        captureId: capture.captureId,
        environment: env.DEPLOY_ENV ?? resolveTelemetryEnvironment(env),
        testRunId: capture.experimentId?.startsWith("intent-qualification-")
          ? capture.experimentId
          : undefined,
        timestamp: new Date().toISOString(),
      });
    }
  }

  return { qualified, processed, skipped, failed };
}

export async function getQualificationRollup(
  env: IntentQualificationStorageEnv,
): Promise<IntentQualificationRollup> {
  return readRollup(env);
}

export async function getQualificationLog(
  env: IntentQualificationStorageEnv,
): Promise<IntentQualificationRecord[]> {
  return readQualificationLog(env);
}

export async function getQualificationProposals(
  env: IntentQualificationStorageEnv,
): Promise<IntentQualificationAdvisoryProposal[]> {
  return readProposals(env);
}

export async function countPendingQualifications(env: IntentQualificationStorageEnv): Promise<number> {
  const [captures, log] = await Promise.all([getIntentCaptureLog(env), readQualificationLog(env)]);
  const qualifiedIds = new Set(log.map((entry) => entry.captureId));
  return captures.filter((capture) => !qualifiedIds.has(capture.captureId)).length;
}

export async function deleteQualificationsByTestRunId(
  env: IntentQualificationStorageEnv,
  testRunId: string,
): Promise<{ removed: string[] }> {
  const log = await readQualificationLog(env);
  const removed: string[] = [];
  const remaining = log.filter((entry) => {
    if (entry.testRunId === testRunId) {
      removed.push(entry.captureId);
      return false;
    }
    return true;
  });

  await Promise.all(removed.map((captureId) => env.TTX_STATE.delete(qualificationKey(captureId))));
  await writeQualificationLog(env, remaining);
  return { removed };
}
