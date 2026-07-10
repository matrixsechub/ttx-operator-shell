import { buildExperimentFromIntelligence } from "./flowExperiment";
import {
  FLOW_EXPERIMENT_TTL_SECONDS,
  emptyVariantMetrics,
  type FlowExperiment,
  type FlowExperimentVariant,
  type FlowVariantMetrics,
} from "./flowExperimentTypes";
import { buildFlowIntelligenceReport } from "./flowIntelligence";
import { getFlowRollup, getPriorPeriodSnapshot } from "./flowStorage";

export interface FlowExperimentStorageEnv {
  TTX_STATE: KVNamespace;
}

function experimentKey(id: string): string {
  return `flow:experiment:${id}`;
}

function variantKey(id: string, variant: FlowExperimentVariant): string {
  return `flow:experiment:${id}:variant:${variant}`;
}

function activePageKey(page: string): string {
  return `flow:experiment:active:${page}`;
}

function sessionAssignmentKey(sessionId: string): string {
  return `flow:experiment:session:${sessionId}`;
}

export async function readExperiment(
  env: FlowExperimentStorageEnv,
  id: string,
): Promise<FlowExperiment | null> {
  const raw = await env.TTX_STATE.get(experimentKey(id));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as FlowExperiment;
  } catch {
    return null;
  }
}

export async function writeExperiment(env: FlowExperimentStorageEnv, experiment: FlowExperiment): Promise<void> {
  experiment.updatedAt = new Date().toISOString();
  await env.TTX_STATE.put(experimentKey(experiment.id), JSON.stringify(experiment), {
    expirationTtl: FLOW_EXPERIMENT_TTL_SECONDS,
  });
  await env.TTX_STATE.put(activePageKey(experiment.page), experiment.id, {
    expirationTtl: FLOW_EXPERIMENT_TTL_SECONDS,
  });
}

export async function readActiveExperimentForPage(
  env: FlowExperimentStorageEnv,
  page: string,
): Promise<FlowExperiment | null> {
  const id = await env.TTX_STATE.get(activePageKey(page));
  if (!id) return null;
  return readExperiment(env, id);
}

export async function readVariantMetrics(
  env: FlowExperimentStorageEnv,
  experimentId: string,
  variant: FlowExperimentVariant,
): Promise<FlowVariantMetrics> {
  const raw = await env.TTX_STATE.get(variantKey(experimentId, variant));
  if (!raw) return emptyVariantMetrics();
  try {
    return JSON.parse(raw) as FlowVariantMetrics;
  } catch {
    return emptyVariantMetrics();
  }
}

export async function writeVariantMetrics(
  env: FlowExperimentStorageEnv,
  experimentId: string,
  variant: FlowExperimentVariant,
  metrics: FlowVariantMetrics,
): Promise<void> {
  await env.TTX_STATE.put(variantKey(experimentId, variant), JSON.stringify(metrics), {
    expirationTtl: FLOW_EXPERIMENT_TTL_SECONDS,
  });
}

export async function readSessionAssignment(
  env: FlowExperimentStorageEnv,
  sessionId: string,
): Promise<{ experimentId: string; variant: FlowExperimentVariant } | null> {
  const raw = await env.TTX_STATE.get(sessionAssignmentKey(sessionId));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as { experimentId: string; variant: FlowExperimentVariant };
  } catch {
    return null;
  }
}

export async function writeSessionAssignment(
  env: FlowExperimentStorageEnv,
  sessionId: string,
  experimentId: string,
  variant: FlowExperimentVariant,
): Promise<void> {
  await env.TTX_STATE.put(
    sessionAssignmentKey(sessionId),
    JSON.stringify({ experimentId, variant }),
    { expirationTtl: 7 * 24 * 60 * 60 },
  );
}

export async function syncActiveExperimentFromIntelligence(
  env: FlowExperimentStorageEnv,
): Promise<FlowExperiment | null> {
  const [rollup, prior] = await Promise.all([getFlowRollup(env), getPriorPeriodSnapshot(env)]);
  const intelligence = buildFlowIntelligenceReport(rollup, prior);
  const candidate = buildExperimentFromIntelligence(intelligence);
  if (!candidate) return null;

  const existing = await readActiveExperimentForPage(env, candidate.page);
  if (existing && existing.id === candidate.id) {
    return existing;
  }

  if (existing) {
    return existing;
  }

  await writeExperiment(env, candidate);
  await Promise.all([
    writeVariantMetrics(env, candidate.id, "A", emptyVariantMetrics()),
    writeVariantMetrics(env, candidate.id, "B", emptyVariantMetrics()),
  ]);

  return candidate;
}

export async function getActiveExperiment(env: FlowExperimentStorageEnv): Promise<FlowExperiment | null> {
  await syncActiveExperimentFromIntelligence(env);

  const rollup = await getFlowRollup(env);
  const pages = Object.keys(rollup.pageVisits);
  for (const page of pages) {
    const experiment = await readActiveExperimentForPage(env, page);
    if (experiment) return experiment;
  }

  return null;
}
