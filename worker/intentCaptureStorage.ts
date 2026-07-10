import { bumpTopIntent } from "./intentCapture";
import {
  INTENT_LOG_MAX,
  INTENT_ROLLUP_TTL_SECONDS,
  INTENT_TTL_SECONDS,
  emptyIntentRollup,
  type IntentCaptureRecord,
  type IntentCaptureRollup,
  type IntentHandoffEvent,
} from "./intentCaptureTypes";

export interface IntentCaptureStorageEnv {
  TTX_STATE: KVNamespace;
}

const ROLLUP_KEY = "intent:rollup:v1";
const LOG_KEY = "intent:log";

function sessionKey(sessionId: string): string {
  return `intent:${sessionId}`;
}

function sourceKey(source: string): string {
  return `intent:source:${source}`;
}

function pageKey(page: string): string {
  return `intent:page:${page}`;
}

function captureKey(captureId: string): string {
  return `intent:capture:${captureId}`;
}

function incrementRecord(record: Record<string, number>, key: string, delta = 1): void {
  record[key] = (record[key] ?? 0) + delta;
}

async function readRollup(env: IntentCaptureStorageEnv): Promise<IntentCaptureRollup> {
  const raw = await env.TTX_STATE.get(ROLLUP_KEY);
  if (!raw) return emptyIntentRollup();
  try {
    return JSON.parse(raw) as IntentCaptureRollup;
  } catch {
    return emptyIntentRollup();
  }
}

async function writeRollup(env: IntentCaptureStorageEnv, rollup: IntentCaptureRollup): Promise<void> {
  rollup.updatedAt = new Date().toISOString();
  await env.TTX_STATE.put(ROLLUP_KEY, JSON.stringify(rollup), {
    expirationTtl: INTENT_ROLLUP_TTL_SECONDS,
  });
}

async function readLog(env: IntentCaptureStorageEnv): Promise<IntentCaptureRecord[]> {
  const raw = await env.TTX_STATE.get(LOG_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as IntentCaptureRecord[];
  } catch {
    return [];
  }
}

async function writeLog(env: IntentCaptureStorageEnv, records: IntentCaptureRecord[]): Promise<void> {
  await env.TTX_STATE.put(LOG_KEY, JSON.stringify(records.slice(0, INTENT_LOG_MAX)), {
    expirationTtl: INTENT_ROLLUP_TTL_SECONDS,
  });
}

async function incrementCounterKey(env: IntentCaptureStorageEnv, key: string): Promise<void> {
  const raw = await env.TTX_STATE.get(key);
  const next = (raw ? Number(raw) : 0) + 1;
  await env.TTX_STATE.put(key, String(Number.isFinite(next) ? next : 1), {
    expirationTtl: INTENT_ROLLUP_TTL_SECONDS,
  });
}

export async function persistIntentCapture(
  env: IntentCaptureStorageEnv,
  record: IntentCaptureRecord,
): Promise<void> {
  const rollup = await readRollup(env);
  rollup.captures += 1;
  if (record.previewGenerated) rollup.previews += 1;
  incrementRecord(rollup.bySource, record.source);
  incrementRecord(rollup.byPage, record.page);
  rollup.topIntents = bumpTopIntent(rollup.topIntents, record.intent);

  const log = await readLog(env);
  log.unshift(record);

  await Promise.all([
    env.TTX_STATE.put(sessionKey(record.sessionId), JSON.stringify(record), {
      expirationTtl: INTENT_TTL_SECONDS,
    }),
    env.TTX_STATE.put(captureKey(record.captureId), JSON.stringify(record), {
      expirationTtl: INTENT_TTL_SECONDS,
    }),
    incrementCounterKey(env, sourceKey(record.source)),
    incrementCounterKey(env, pageKey(record.page)),
    writeRollup(env, rollup),
    writeLog(env, log),
  ]);
}

export async function recordIntentHandoffEvent(
  env: IntentCaptureStorageEnv,
  event: IntentHandoffEvent,
): Promise<void> {
  const rollup = await readRollup(env);
  switch (event) {
    case "preview_generated":
      break;
    case "preview_abandoned":
      rollup.previewAbandoned += 1;
      break;
    case "unlock_clicked":
      rollup.unlockClicks += 1;
      rollup.handoffs += 1;
      break;
    case "booking_clicked":
      rollup.bookingClicks += 1;
      rollup.handoffs += 1;
      break;
    case "module_clicked":
      rollup.moduleClicks += 1;
      rollup.handoffs += 1;
      break;
    default: {
      const _exhaustive: never = event;
      void _exhaustive;
    }
  }
  await writeRollup(env, rollup);
}

export async function getIntentCaptureRollup(env: IntentCaptureStorageEnv): Promise<IntentCaptureRollup> {
  return readRollup(env);
}

export async function getIntentCaptureLog(env: IntentCaptureStorageEnv): Promise<IntentCaptureRecord[]> {
  return readLog(env);
}

export async function readIntentCaptureForSession(
  env: IntentCaptureStorageEnv,
  sessionId: string,
): Promise<IntentCaptureRecord | null> {
  const raw = await env.TTX_STATE.get(sessionKey(sessionId));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as IntentCaptureRecord;
  } catch {
    return null;
  }
}

export async function readIntentCaptureByCaptureId(
  env: IntentCaptureStorageEnv,
  captureId: string,
): Promise<IntentCaptureRecord | null> {
  const raw = await env.TTX_STATE.get(captureKey(captureId));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as IntentCaptureRecord;
  } catch {
    return null;
  }
}
