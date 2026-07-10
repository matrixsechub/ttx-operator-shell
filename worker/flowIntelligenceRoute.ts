import { buildFlowIntelligenceReport, formatFlowIntelligenceReport } from "./flowIntelligence";
import { getFlowRollup, getPriorPeriodSnapshot, maybeSnapshotRollup } from "./flowStorage";
import type { FlowStorageEnv } from "./flowStorage";

export async function handleFlowIntelligenceRoute(
  request: Request,
  pathname: string,
  env: FlowStorageEnv,
): Promise<Response | null> {
  if (pathname !== "/api/flow/intelligence") return null;
  if (request.method !== "GET") {
    return Response.json({ error: "Method not allowed" }, { status: 405, headers: { Allow: "GET" } });
  }

  await maybeSnapshotRollup(env);
  const [rollup, priorRollup] = await Promise.all([getFlowRollup(env), getPriorPeriodSnapshot(env)]);
  const intelligence = buildFlowIntelligenceReport(rollup, priorRollup);
  const report = formatFlowIntelligenceReport(intelligence, true);

  return Response.json({
    ...intelligence,
    report,
  });
}
