import { buildExperimentationSnapshot, EXPERIMENT_MODES, type ExperimentationPerformance } from "./experimentation";
import { resolveBehaviorDrivenUiMode } from "./experimentationBehavior";
import { analyzeBehaviorIntelligence } from "./behaviorIntelligence";
import { buildAdaptationFeedback } from "./adaptation";
import { getUsageSummary, type UsageContextEnv } from "./usage";
import { getTrafficSourceSummary, listActiveTrafficSources } from "./trafficSources";
import { buildOrganicActivationProgress } from "./activation/organicProgress";
import type { ModeEnv } from "./mode";

export type TrafficNextAction = "scale" | "adjust" | "fix";

export interface TrafficActivationSnapshot {
  sessionsGenerated: number;
  trafficSources: string[];
  trafficSourceCounts: Record<string, number>;
  modeDistribution: Record<string, number>;
  performanceByMode: ExperimentationPerformance &
    Record<string, { views: number; entryRate: number; marketplaceRate: number; dropOffRate: number }>;
  systemState: "EXPERIMENTING" | "OPTIMIZING";
  winningMode: string | null;
  confidenceLevel: string;
  signalIntegrity: string;
  nextAction: TrafficNextAction;
  qualifiedOrganicSessions: number;
  confidenceBlockers: string[];
  promotionEligibleWinner: string | null;
}

function resolveNextAction(input: {
  systemState: "EXPERIMENTING" | "OPTIMIZING";
  sessionsGenerated: number;
  signalIntegrity: string;
  minModeViews: number;
}): TrafficNextAction {
  if (input.signalIntegrity !== "VALID") return "fix";
  if (input.systemState === "OPTIMIZING") return "adjust";
  if (input.sessionsGenerated < 100 || input.minModeViews < 20) return "scale";
  return "scale";
}

export async function buildTrafficActivationSnapshot(env: UsageContextEnv): Promise<TrafficActivationSnapshot> {
  const assembledAt = new Date().toISOString();
  const usage = await getUsageSummary(env);
  const adaptation = await buildAdaptationFeedback(env);
  const behaviorIntelligence = analyzeBehaviorIntelligence(usage);
  const experimentation = buildExperimentationSnapshot(
    adaptation,
    resolveBehaviorDrivenUiMode(behaviorIntelligence),
    assembledAt,
  );
  const trafficSourceCounts = await getTrafficSourceSummary(env);
  const modeViews = ["CONFUSION", "FRICTION", "ENGAGED"].map(
    (mode) => experimentation.performanceByMode[mode as keyof typeof experimentation.performanceByMode].views,
  );
  const minModeViews = Math.min(...modeViews);
  const organicProgress = await buildOrganicActivationProgress(env);

  return {
    sessionsGenerated: usage.visits,
    trafficSources: listActiveTrafficSources(trafficSourceCounts),
    trafficSourceCounts,
    modeDistribution: experimentation.modeDistribution,
    performanceByMode: experimentation.performanceByMode,
    systemState: experimentation.systemState,
    winningMode: experimentation.winningMode,
    confidenceLevel: experimentation.confidenceLevel,
    signalIntegrity: usage.signalIntegrity,
    nextAction: resolveNextAction({
      systemState: experimentation.systemState,
      sessionsGenerated: usage.visits,
      signalIntegrity: usage.signalIntegrity,
      minModeViews,
    }),
    qualifiedOrganicSessions: organicProgress.qualifiedOrganicSessions,
    confidenceBlockers: organicProgress.blockers,
    promotionEligibleWinner: organicProgress.promotionEligibleWinner,
  };
}

export function formatTrafficActivationReport(snapshot: TrafficActivationSnapshot): string {
  const distribution = Object.entries(snapshot.modeDistribution)
    .map(([mode, pct]) => `${mode}=${pct}%`)
    .join(", ");

  const sources =
    snapshot.trafficSources.length > 0
      ? snapshot.trafficSources
          .map((source) => `${source}(${snapshot.trafficSourceCounts[source as keyof typeof snapshot.trafficSourceCounts] ?? 0})`)
          .join(", ")
      : "(none recorded)";

  const performance = [...EXPERIMENT_MODES, "DEFAULT" as const]
    .map((mode) => {
      const metrics = snapshot.performanceByMode[mode];
      return `${mode}: views=${metrics.views}, entry=${metrics.entryRate}, marketplace=${metrics.marketplaceRate}, drop_off=${metrics.dropOffRate}`;
    })
    .join("; ");

  return [
    "# TRAFFIC_ACTIVATION_REPORT",
    "## sessions_generated",
    String(snapshot.sessionsGenerated),
    "## traffic_sources",
    sources,
    "## mode_distribution",
    distribution,
    "## performance_by_mode",
    performance,
    "## system_state",
    snapshot.systemState,
    "## winning_mode",
    snapshot.winningMode ?? "UNRESOLVED",
    "## confidence_level",
    snapshot.confidenceLevel,
    "## signal_integrity",
    snapshot.signalIntegrity,
    "## qualified_organic_sessions",
    String(snapshot.qualifiedOrganicSessions),
    "## confidence_blockers",
    snapshot.confidenceBlockers.length > 0 ? snapshot.confidenceBlockers.join(", ") : "(none)",
    "## promotion_eligible_winner",
    snapshot.promotionEligibleWinner ?? "BLOCKED",
    "## next_action",
    snapshot.nextAction,
  ].join("\n");
}

export async function handleTrafficActivationRoute(
  request: Request,
  pathname: string,
  env: UsageContextEnv & ModeEnv,
): Promise<Response | null> {
  if (pathname !== "/api/traffic/activation") return null;
  if (request.method !== "GET") {
    return Response.json({ error: "Method not allowed" }, { status: 405, headers: { Allow: "GET" } });
  }

  const snapshot = await buildTrafficActivationSnapshot(env);
  return Response.json({
    ok: true,
    activation: snapshot,
    report: formatTrafficActivationReport(snapshot),
  });
}
