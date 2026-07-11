import {
  assignFlowExperimentVariant,
  buildFlowExperimentAssignment,
  buildFlowExperimentOutcome,
  buildFlowExperimentReport,
  formatFlowExperimentReport,
} from "./flowExperiment";
import {
  getActiveExperiment,
  readVariantMetrics,
  syncActiveExperimentFromIntelligence,
  writeSessionAssignment,
  type FlowExperimentStorageEnv,
} from "./flowExperimentStorage";
import { isValidSessionId } from "./usage";

export async function handleFlowExperimentAssignmentRoute(
  request: Request,
  pathname: string,
  env: FlowExperimentStorageEnv,
): Promise<Response | null> {
  if (pathname !== "/api/flow/experiment/assignment") return null;
  if (request.method !== "GET") {
    return Response.json({ error: "Method not allowed" }, { status: 405, headers: { Allow: "GET" } });
  }

  const url = new URL(request.url);
  const sessionId = url.searchParams.get("sessionId");
  const pageParam = url.searchParams.get("page");

  if (!sessionId || !isValidSessionId(sessionId)) {
    return Response.json({ error: "sessionId query param must be a UUID v4" }, { status: 400 });
  }

  const experiment = await syncActiveExperimentFromIntelligence(env);
  if (!experiment) {
    return Response.json({
      ok: true,
      ...buildFlowExperimentAssignment(sessionId, null, null),
    });
  }

  if (pageParam && pageParam !== experiment.page) {
    return Response.json({
      ok: true,
      ...buildFlowExperimentAssignment(sessionId, null, null),
    });
  }

  const variant = assignFlowExperimentVariant(sessionId, experiment.id);
  await writeSessionAssignment(env, sessionId, experiment.id, variant);

  const [variantA, variantB] = await Promise.all([
    readVariantMetrics(env, experiment.id, "A"),
    readVariantMetrics(env, experiment.id, "B"),
  ]);
  const outcome = buildFlowExperimentOutcome(experiment, variantA, variantB);
  const assignment = buildFlowExperimentAssignment(sessionId, experiment, outcome);

  return Response.json({
    ok: true,
    ...assignment,
    outcome,
  });
}

export async function handleFlowExperimentReportRoute(
  request: Request,
  pathname: string,
  env: FlowExperimentStorageEnv,
): Promise<Response | null> {
  if (pathname !== "/api/flow/experiment/report") return null;
  if (request.method !== "GET") {
    return Response.json({ error: "Method not allowed" }, { status: 405, headers: { Allow: "GET" } });
  }

  const experiment = await getActiveExperiment(env);
  if (!experiment) {
    const report = buildFlowExperimentReport(null, null);
    return Response.json({
      ok: true,
      ...report,
      report: formatFlowExperimentReport(report, false),
    });
  }

  const [variantA, variantB] = await Promise.all([
    readVariantMetrics(env, experiment.id, "A"),
    readVariantMetrics(env, experiment.id, "B"),
  ]);
  const outcome = buildFlowExperimentOutcome(experiment, variantA, variantB);
  const report = buildFlowExperimentReport(experiment, outcome);

  return Response.json({
    ok: true,
    ...report,
    report: formatFlowExperimentReport(report, true),
  });
}
