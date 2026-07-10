import { analyzeBehaviorIntelligence } from "./behaviorIntelligence";
import { buildAdaptationFeedback } from "./adaptation";
import {
  assignExperimentalUiMode,
  buildExperimentationSnapshot,
  formatExperimentationReport,
  type ExperimentationSnapshot,
  type ModeAssignment,
} from "./experimentation";
import { resolveBehaviorDrivenUiMode } from "./experimentationBehavior";
import type { ModeEnv } from "./mode";
import { getUsageSummary, isValidSessionId, type UsageContextEnv } from "./usage";

export async function buildExperimentationState(
  env: UsageContextEnv,
  assembledAt: string,
): Promise<ExperimentationSnapshot> {
  const usage = await getUsageSummary(env);
  const adaptation = await buildAdaptationFeedback(env);
  const behaviorMode = resolveBehaviorDrivenUiMode(analyzeBehaviorIntelligence(usage));
  return buildExperimentationSnapshot(adaptation, behaviorMode, assembledAt);
}

export async function resolveModeAssignment(
  env: UsageContextEnv,
  sessionId: string,
): Promise<ModeAssignment | null> {
  if (!isValidSessionId(sessionId)) return null;
  const snapshot = await buildExperimentationState(env, new Date().toISOString());
  return assignExperimentalUiMode(sessionId, snapshot.behaviorMode, snapshot);
}

export async function handleExperimentationRoute(
  request: Request,
  pathname: string,
  env: UsageContextEnv & ModeEnv,
): Promise<Response | null> {
  if (pathname === "/api/experimentation/report") {
    if (request.method !== "GET") {
      return Response.json({ error: "Method not allowed" }, { status: 405, headers: { Allow: "GET" } });
    }

    const snapshot = await buildExperimentationState(env, new Date().toISOString());
    return Response.json({
      ok: true,
      experimentation: snapshot,
      report: formatExperimentationReport(snapshot),
    });
  }

  if (pathname === "/api/experimentation/assignment") {
    if (request.method !== "GET") {
      return Response.json({ error: "Method not allowed" }, { status: 405, headers: { Allow: "GET" } });
    }

    const sessionId = new URL(request.url).searchParams.get("sessionId");
    if (!sessionId || !isValidSessionId(sessionId)) {
      return Response.json({ error: "sessionId query param must be a UUID v4" }, { status: 400 });
    }

    const assignment = await resolveModeAssignment(env, sessionId);
    if (!assignment) {
      return Response.json({ error: "invalid sessionId" }, { status: 400 });
    }

    return Response.json({ ok: true, ...assignment });
  }

  return null;
}
