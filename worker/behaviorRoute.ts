import type { ModeEnv } from "./mode";
import { buildAdaptationFeedback } from "./adaptation";
import {
  analyzeBehaviorIntelligence,
  formatBehaviorIntelligenceReport,
  type BehaviorIntelligence,
} from "./behaviorIntelligence";
import { getUsageSummary, type UsageContextEnv } from "./usage";

export async function buildBehaviorIntelligence(env: UsageContextEnv): Promise<BehaviorIntelligence> {
  const usage = await getUsageSummary(env);
  return analyzeBehaviorIntelligence(usage);
}

export async function handleBehaviorIntelligenceRoute(
  request: Request,
  pathname: string,
  env: UsageContextEnv & ModeEnv,
): Promise<Response | null> {
  if (pathname !== "/api/behavior/intelligence") return null;
  if (request.method !== "GET") {
    return Response.json({ error: "Method not allowed" }, { status: 405, headers: { Allow: "GET" } });
  }

  const intelligence = await buildBehaviorIntelligence(env);
  const report = formatBehaviorIntelligenceReport(intelligence);
  const adaptation = await buildAdaptationFeedback(env);

  return Response.json({
    ok: true,
    intelligence,
    adaptation,
    report,
    usage: await getUsageSummary(env),
  });
}
