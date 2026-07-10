import type { OrganicActivationProgress } from "./types";
import { ORGANIC_PROGRESS_TARGETS } from "./types";
import { getQualifiedOrganicTotal, countQualifiedOrganicSources } from "./qualifiedRollup";
import { getUsageSummary, type UsageContextEnv } from "../usage";
import { getTrafficSourceSummary, TRAFFIC_SOURCE_CHANNELS } from "../trafficSources";
import { buildAdaptationFeedback } from "../adaptation";
import { buildExperimentationSnapshot } from "../experimentation";
import { resolveBehaviorDrivenUiMode } from "../experimentationBehavior";
import { analyzeBehaviorIntelligence } from "../behaviorIntelligence";

const EXCLUDED_SOURCES = new Set(["synthetic_injection", "internal"]);

export async function buildOrganicActivationProgress(env: UsageContextEnv): Promise<OrganicActivationProgress> {
  const usage = await getUsageSummary(env);
  const trafficSources = await getTrafficSourceSummary(env);
  const adaptation = await buildAdaptationFeedback(env);
  const behaviorIntelligence = analyzeBehaviorIntelligence(usage);
  const experimentation = buildExperimentationSnapshot(
    adaptation,
    resolveBehaviorDrivenUiMode(behaviorIntelligence),
    new Date().toISOString(),
  );

  const organicSources = TRAFFIC_SOURCE_CHANNELS.filter(
    (source) => !EXCLUDED_SOURCES.has(source) && trafficSources[source] > 0,
  );

  const qualifiedOrganicSessions = await getQualifiedOrganicTotal(env);
  const qualifiedOrganicSourceCount = await countQualifiedOrganicSources(env);
  const organicSourceCount = Math.max(organicSources.length, qualifiedOrganicSourceCount);

  const qualifiedViewsPerMode: Record<string, number> = {
    CONFUSION: experimentation.performanceByMode.CONFUSION.views,
    FRICTION: experimentation.performanceByMode.FRICTION.views,
    ENGAGED: experimentation.performanceByMode.ENGAGED.views,
  };

  const totalValidSessions = usage.visits;
  const gates = {
    totalSessions: {
      target: ORGANIC_PROGRESS_TARGETS.totalSessions,
      current: totalValidSessions,
      met: totalValidSessions >= ORGANIC_PROGRESS_TARGETS.totalSessions,
    },
    qualifiedOrganic: {
      target: ORGANIC_PROGRESS_TARGETS.qualifiedOrganic,
      current: qualifiedOrganicSessions,
      met: qualifiedOrganicSessions >= ORGANIC_PROGRESS_TARGETS.qualifiedOrganic,
    },
    organicSources: {
      target: ORGANIC_PROGRESS_TARGETS.organicSources,
      current: organicSourceCount,
      met: organicSourceCount >= ORGANIC_PROGRESS_TARGETS.organicSources,
    },
    qualifiedViewsPerMode: {
      target: ORGANIC_PROGRESS_TARGETS.qualifiedViewsPerMode,
      current: qualifiedViewsPerMode,
      met: Object.values(qualifiedViewsPerMode).every(
        (v) => v >= ORGANIC_PROGRESS_TARGETS.qualifiedViewsPerMode,
      ),
    },
  };

  const blockers: string[] = [];
  if (!gates.totalSessions.met) blockers.push("total_sessions_below_target");
  if (!gates.qualifiedOrganic.met) blockers.push("qualified_organic_below_target");
  if (!gates.organicSources.met) blockers.push("organic_source_diversity_below_target");
  if (!gates.qualifiedViewsPerMode.met) blockers.push("qualified_views_per_mode_below_target");
  if (usage.signalIntegrity !== "VALID") blockers.push("signal_integrity_invalid");

  let confidence: "LOW" | "MEDIUM" | "HIGH" = "LOW";
  if (gates.qualifiedOrganic.met && gates.organicSources.met) {
    confidence = organicSourceCount >= 4 ? "HIGH" : "MEDIUM";
  }
  if (blockers.length === 0 && confidence === "HIGH") {
    confidence = "HIGH";
  } else if (blockers.length <= 1 && gates.qualifiedOrganic.current >= 30) {
    confidence = "MEDIUM";
  }

  const allGatesMet = blockers.length === 0;
  const promotionEligibleWinner =
    allGatesMet && experimentation.winningMode ? experimentation.winningMode : null;

  return {
    totalValidSessions,
    qualifiedOrganicSessions,
    organicSourceCount,
    qualifiedViewsPerMode,
    confidence,
    promotionEligibleWinner,
    blockers,
    gates,
    updatedAt: new Date().toISOString(),
  };
}

export async function countQualifiedOrganicSessions(env: UsageContextEnv): Promise<number> {
  const progress = await buildOrganicActivationProgress(env);
  return progress.qualifiedOrganicSessions;
}
