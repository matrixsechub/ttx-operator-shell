import { isValidSessionId } from "./usage";
import {
  emptyFlowRollup,
  FLOW_MAX_SESSION_STEPS,
  FLOW_ROLLUP_TTL_SECONDS,
  FLOW_SESSION_TTL_SECONDS,
  FLOW_SNAPSHOT_TTL_SECONDS,
  sanitizeCtaId,
  sanitizeFlowPage,
  type FlowEventInput,
  type FlowEventResult,
  type FlowRollup,
  type FlowSessionPacket,
  type FlowStep,
} from "./flowTypes";

const ROLLUP_KEY = "flow:rollup:v1";

export interface FlowStorageEnv {
  TTX_STATE: KVNamespace;
}

function sessionKey(sessionId: string): string {
  return `flow:session:${sessionId}`;
}

function snapshotKey(date: string): string {
  return `flow:snapshot:${date}`;
}

function ctaKey(page: string, ctaId: string): string {
  return `${page}::${ctaId}`;
}

function formKey(page: string, formId?: string): string {
  return formId ? `${page}::${formId}` : page;
}

function incrementRecord(record: Record<string, number>, key: string, delta = 1): void {
  record[key] = (record[key] ?? 0) + delta;
}

function detectLoop(steps: FlowStep[]): boolean {
  const pages = steps.map((step) => step.page);
  for (let index = 2; index < pages.length; index += 1) {
    if (pages[index] === pages[index - 2] && pages[index - 1] !== pages[index]) {
      return true;
    }
  }
  return false;
}

function pathSignature(steps: FlowStep[]): string {
  return steps.map((step) => step.page).join("→");
}

function currentStep(packet: FlowSessionPacket): FlowStep | null {
  return packet.steps.length > 0 ? packet.steps[packet.steps.length - 1]! : null;
}

function ensureStep(packet: FlowSessionPacket, page: string): FlowStep {
  const existing = currentStep(packet);
  if (existing && existing.page === page) return existing;

  const step: FlowStep = {
    page,
    enteredAt: new Date().toISOString(),
    dwellMs: 0,
    clicks: 0,
    ctaImpressions: 0,
    ctaClicks: 0,
    formStarted: false,
    formSubmitted: false,
  };
  packet.steps.push(step);
  packet.exitPage = page;
  incrementRecord(packet.revisitCounts, page);
  return step;
}

async function readRollup(env: FlowStorageEnv): Promise<FlowRollup> {
  const raw = await env.TTX_STATE.get(ROLLUP_KEY);
  if (!raw) return emptyFlowRollup();
  try {
    return JSON.parse(raw) as FlowRollup;
  } catch {
    return emptyFlowRollup();
  }
}

async function writeRollup(env: FlowStorageEnv, rollup: FlowRollup): Promise<void> {
  rollup.updatedAt = new Date().toISOString();
  await env.TTX_STATE.put(ROLLUP_KEY, JSON.stringify(rollup), {
    expirationTtl: FLOW_ROLLUP_TTL_SECONDS,
  });
}

async function readSession(env: FlowStorageEnv, sessionId: string): Promise<FlowSessionPacket | null> {
  const raw = await env.TTX_STATE.get(sessionKey(sessionId));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as FlowSessionPacket;
  } catch {
    return null;
  }
}

async function writeSession(env: FlowStorageEnv, packet: FlowSessionPacket): Promise<void> {
  packet.updatedAt = new Date().toISOString();
  await env.TTX_STATE.put(sessionKey(packet.sessionId), JSON.stringify(packet), {
    expirationTtl: FLOW_SESSION_TTL_SECONDS,
  });
}

function createSessionPacket(sessionId: string, page: string, trafficSource?: string): FlowSessionPacket {
  return {
    sessionId,
    trafficSource,
    landingPage: page,
    exitPage: page,
    steps: [],
    revisitCounts: {},
    updatedAt: new Date().toISOString(),
  };
}

function updateRollupForPageView(
  rollup: FlowRollup,
  packet: FlowSessionPacket,
  page: string,
  dwellMs: number,
  isNewSession: boolean,
): void {
  if (isNewSession) {
    rollup.sessionCount += 1;
    incrementRecord(rollup.entries, page);
  }

  incrementRecord(rollup.pageVisits, page);

  const previous = packet.steps.length > 1 ? packet.steps[packet.steps.length - 2] : null;
  if (previous && previous.page !== page) {
    if (!rollup.transitions[previous.page]) rollup.transitions[previous.page] = {};
    incrementRecord(rollup.transitions[previous.page]!, page);
    incrementRecord(rollup.exits, previous.page);
  }

  if (dwellMs > 0) {
    incrementRecord(rollup.dwellSumMs, previous?.page ?? page, dwellMs);
    incrementRecord(rollup.dwellCount, previous?.page ?? page);
  }

  if (packet.steps.length === 1 && isNewSession) {
    rollup.singlePageSessions += 1;
  } else if (packet.steps.length === 1 && !isNewSession) {
    rollup.singlePageSessions = Math.max(0, rollup.singlePageSessions - 1);
  }

  if (detectLoop(packet.steps) && !packet.loopRecorded) {
    rollup.loopSessionCount += 1;
    packet.loopRecorded = true;
  }

  const signature = pathSignature(packet.steps);
  if (signature) incrementRecord(rollup.pathCounts, signature);
}

export async function recordFlowEvent(env: FlowStorageEnv, input: FlowEventInput): Promise<FlowEventResult> {
  const page = sanitizeFlowPage(input.page);
  if (!isValidSessionId(input.sessionId)) {
    return { counted: false, reason: "invalid_session" };
  }
  if (!page) {
    return { counted: false, reason: "invalid_page" };
  }

  const existing = await readSession(env, input.sessionId);
  const isNewSession = existing === null;
  const packet = existing ?? createSessionPacket(input.sessionId, page, input.trafficSource);
  const rollup = await readRollup(env);

  if (input.event === "page_view") {
    if (packet.steps.length >= FLOW_MAX_SESSION_STEPS && currentStep(packet)?.page !== page) {
      return { counted: false, reason: "step_cap" };
    }

    const previous = currentStep(packet);
    const dwellMs = typeof input.dwellMs === "number" && input.dwellMs >= 0 ? Math.round(input.dwellMs) : 0;
    if (previous && previous.page !== page && dwellMs > 0) {
      previous.dwellMs += dwellMs;
      if (input.clickDelta && input.clickDelta > 0) {
        previous.clicks += input.clickDelta;
        incrementRecord(rollup.pageClicks, previous.page, input.clickDelta);
      }
    }

    const step = ensureStep(packet, page);
    void step;
    updateRollupForPageView(rollup, packet, page, dwellMs, isNewSession);
  } else {
    const step = ensureStep(packet, page);
    switch (input.event) {
      case "click": {
        const delta = input.clickDelta && input.clickDelta > 0 ? input.clickDelta : 1;
        step.clicks += delta;
        incrementRecord(rollup.pageClicks, page, delta);
        break;
      }
      case "cta_impression": {
        const ctaId = sanitizeCtaId(input.ctaId) ?? "unknown";
        step.ctaImpressions += 1;
        incrementRecord(rollup.ctaImpressions, ctaKey(page, ctaId));
        break;
      }
      case "cta_click": {
        const ctaId = sanitizeCtaId(input.ctaId) ?? "unknown";
        step.ctaClicks += 1;
        incrementRecord(rollup.ctaClicks, ctaKey(page, ctaId));
        break;
      }
      case "form_start": {
        if (!step.formStarted) {
          step.formStarted = true;
          incrementRecord(rollup.formStarts, formKey(page, input.formId));
        }
        break;
      }
      case "form_submit": {
        step.formSubmitted = true;
        incrementRecord(rollup.formSubmits, formKey(page, input.formId));
        break;
      }
      default: {
        return { counted: false, reason: "invalid_event" };
      }
    }
  }

  await Promise.all([writeSession(env, packet), writeRollup(env, rollup)]);
  return { counted: true };
}

export async function getFlowRollup(env: FlowStorageEnv): Promise<FlowRollup> {
  return readRollup(env);
}

export async function getFlowSnapshot(env: FlowStorageEnv, date: string): Promise<FlowRollup | null> {
  const raw = await env.TTX_STATE.get(snapshotKey(date));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as FlowRollup;
  } catch {
    return null;
  }
}

export async function maybeSnapshotRollup(env: FlowStorageEnv): Promise<void> {
  const rollup = await readRollup(env);
  const today = new Date().toISOString().slice(0, 10);
  if (rollup.lastSnapshotDate === today) return;

  const yesterday = new Date();
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const yesterdayKey = yesterday.toISOString().slice(0, 10);

  const snapshotRollup = { ...rollup, lastSnapshotDate: undefined };
  await env.TTX_STATE.put(snapshotKey(yesterdayKey), JSON.stringify(snapshotRollup), {
    expirationTtl: FLOW_SNAPSHOT_TTL_SECONDS,
  });

  rollup.lastSnapshotDate = today;
  await writeRollup(env, rollup);
}

export async function getPriorPeriodSnapshot(env: FlowStorageEnv): Promise<FlowRollup | null> {
  const weekAgo = new Date();
  weekAgo.setUTCDate(weekAgo.getUTCDate() - 7);
  return getFlowSnapshot(env, weekAgo.toISOString().slice(0, 10));
}
