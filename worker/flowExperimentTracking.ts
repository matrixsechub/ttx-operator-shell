import {
  assignFlowExperimentVariant,
  mergeVariantMetrics,
  metricsDeltaForFlowEvent,
} from "./flowExperiment";
import {
  readActiveExperimentForPage,
  readExperiment,
  readSessionAssignment,
  readVariantMetrics,
  writeSessionAssignment,
  writeVariantMetrics,
  type FlowExperimentStorageEnv,
} from "./flowExperimentStorage";
import type { FlowEventType } from "./flowTypes";

export async function recordFlowExperimentOutcome(
  env: FlowExperimentStorageEnv,
  sessionId: string,
  page: string,
  event: FlowEventType,
  options: { dwellMs?: number; clickDelta?: number },
): Promise<void> {
  let assignment = await readSessionAssignment(env, sessionId);
  if (!assignment) {
    const experiment = await readActiveExperimentForPage(env, page);
    if (!experiment) return;
    const variant = assignFlowExperimentVariant(sessionId, experiment.id);
    assignment = { experimentId: experiment.id, variant };
    await writeSessionAssignment(env, sessionId, experiment.id, variant);
  }

  const experiment = await readExperiment(env, assignment.experimentId);
  if (!experiment || experiment.page !== page) return;

  const isDropOff =
    event === "page_view" &&
    typeof options.dwellMs === "number" &&
    options.dwellMs >= 30_000 &&
    (options.clickDelta ?? 0) === 0;

  const delta = metricsDeltaForFlowEvent(event, {
    isProgression: event === "cta_click" || event === "form_submit",
    isDropOff,
  });

  const current = await readVariantMetrics(env, assignment.experimentId, assignment.variant);
  await writeVariantMetrics(
    env,
    assignment.experimentId,
    assignment.variant,
    mergeVariantMetrics(current, delta),
  );
}
