import type { AdaptationFeedback, ModeAdaptationRates } from "./adaptation";
import type { GovernanceProposal } from "./governanceAutomation";
import type { AdaptiveUiMode } from "./usageModeMetrics";
import { ADAPTIVE_UI_MODES } from "./usageModeMetrics";

export const EXPERIMENT_MODES = ["CONFUSION", "FRICTION", "ENGAGED"] as const;
export type ExperimentMode = (typeof EXPERIMENT_MODES)[number];

export const MIN_VIEWS_PER_MODE = 20;
export const BEHAVIOR_EXPOSURE_WEIGHT = 0.7;
export const RANDOM_EXPOSURE_WEIGHT = 0.3;
export const WINNER_EXPOSURE_WEIGHT = 0.6;
export const MIN_EXPLORATION_WEIGHT = 0.1;

export type ExperimentSystemState = "EXPERIMENTING" | "OPTIMIZING";
export type ConfidenceLevel = "LOW" | "MEDIUM" | "HIGH";
export type AssignmentSource = "behavior" | "explore" | "biased";

export interface ExperimentationPerformance {
  CONFUSION: ModeAdaptationRates;
  FRICTION: ModeAdaptationRates;
  ENGAGED: ModeAdaptationRates;
  DEFAULT: ModeAdaptationRates;
  [key: string]: ModeAdaptationRates;
}

export interface ExperimentationSnapshot {
  modeDistribution: Record<AdaptiveUiMode, number>;
  performanceByMode: ExperimentationPerformance;
  winningMode: ExperimentMode | null;
  worstMode: ExperimentMode | null;
  confidenceLevel: ConfidenceLevel;
  systemState: ExperimentSystemState;
  behaviorMode: AdaptiveUiMode;
  governanceProposals: GovernanceProposal[];
}

export interface ModeAssignment {
  assignedMode: AdaptiveUiMode;
  behaviorMode: AdaptiveUiMode;
  source: AssignmentSource;
  experimentation: ExperimentationSnapshot;
}

function roundPercent(value: number): number {
  return Math.round(value * 10) / 10;
}

function sessionRoll(sessionId: string, salt: string): number {
  let hash = 0;
  const input = `${sessionId}:${salt}`;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return (hash % 10_000) / 10_000;
}

function pickWeightedMode(weights: Record<ExperimentMode, number>, roll: number): ExperimentMode {
  let cumulative = 0;
  for (const mode of EXPERIMENT_MODES) {
    cumulative += weights[mode];
    if (roll < cumulative) return mode;
  }
  return EXPERIMENT_MODES[EXPERIMENT_MODES.length - 1];
}

function pickExploreMode(sessionId: string): ExperimentMode {
  const roll = sessionRoll(sessionId, "explore");
  const index = Math.floor(roll * EXPERIMENT_MODES.length);
  return EXPERIMENT_MODES[Math.min(index, EXPERIMENT_MODES.length - 1)];
}

export function hasMinimumExperimentSamples(performance: ExperimentationPerformance): boolean {
  return EXPERIMENT_MODES.every((mode) => performance[mode].views >= MIN_VIEWS_PER_MODE);
}

export function detectWinningMode(performance: ExperimentationPerformance): ExperimentMode | null {
  if (!hasMinimumExperimentSamples(performance)) return null;

  let winner: ExperimentMode = EXPERIMENT_MODES[0];
  for (const mode of EXPERIMENT_MODES) {
    if (performance[mode].marketplaceRate > performance[winner].marketplaceRate) {
      winner = mode;
    }
  }
  return winner;
}

export function detectWorstMode(performance: ExperimentationPerformance): ExperimentMode | null {
  if (!hasMinimumExperimentSamples(performance)) return null;

  let worst: ExperimentMode = EXPERIMENT_MODES[0];
  for (const mode of EXPERIMENT_MODES) {
    if (performance[mode].marketplaceRate < performance[worst].marketplaceRate) {
      worst = mode;
    }
  }
  return worst;
}

function computeOptimizingWeights(winner: ExperimentMode): Record<ExperimentMode, number> {
  const losers = EXPERIMENT_MODES.filter((mode) => mode !== winner);
  const loserWeight = Math.max((1 - WINNER_EXPOSURE_WEIGHT) / losers.length, MIN_EXPLORATION_WEIGHT);
  const weights: Record<ExperimentMode, number> = {
    CONFUSION: 0,
    FRICTION: 0,
    ENGAGED: 0,
  };
  weights[winner] = WINNER_EXPOSURE_WEIGHT;
  for (const loser of losers) {
    weights[loser] = loserWeight;
  }

  const total = EXPERIMENT_MODES.reduce((sum, mode) => sum + weights[mode], 0);
  if (total <= 1) return weights;

  for (const mode of EXPERIMENT_MODES) {
    weights[mode] = weights[mode] / total;
  }
  return weights;
}

export function computeModeDistribution(
  systemState: ExperimentSystemState,
  behaviorMode: AdaptiveUiMode,
  winningMode: ExperimentMode | null,
): Record<AdaptiveUiMode, number> {
  const distribution: Record<AdaptiveUiMode, number> = {
    CONFUSION: 0,
    FRICTION: 0,
    ENGAGED: 0,
    DEFAULT: 0,
  };

  if (systemState === "OPTIMIZING" && winningMode) {
    const weights = computeOptimizingWeights(winningMode);
    for (const mode of EXPERIMENT_MODES) {
      distribution[mode] = roundPercent(weights[mode] * 100);
    }
    return distribution;
  }

  const exploreEach = (RANDOM_EXPOSURE_WEIGHT / EXPERIMENT_MODES.length) * 100;
  for (const mode of EXPERIMENT_MODES) {
    distribution[mode] = roundPercent(exploreEach);
  }

  if (behaviorMode === "DEFAULT") {
    distribution.DEFAULT = roundPercent(BEHAVIOR_EXPOSURE_WEIGHT * 100);
  } else {
    distribution[behaviorMode] = roundPercent(
      distribution[behaviorMode] + BEHAVIOR_EXPOSURE_WEIGHT * 100,
    );
  }

  return distribution;
}

function resolveConfidenceLevel(
  systemState: ExperimentSystemState,
  performance: ExperimentationPerformance,
  winningMode: ExperimentMode | null,
): ConfidenceLevel {
  if (systemState === "EXPERIMENTING" || !winningMode) return "LOW";

  const rates = EXPERIMENT_MODES.map((mode) => performance[mode].marketplaceRate).sort((a, b) => b - a);
  const margin = rates[0] - rates[1];
  if (margin >= 0.1) return "HIGH";
  return "MEDIUM";
}

export function generateExperimentationGovernanceProposals(
  assembledAt: string,
  winningMode: ExperimentMode | null,
  worstMode: ExperimentMode | null,
  systemState: ExperimentSystemState,
): GovernanceProposal[] {
  if (systemState !== "OPTIMIZING" || !winningMode || !worstMode || winningMode === worstMode) {
    return [];
  }

  const promoteType = `promote_ui_mode::${winningMode}` as GovernanceProposal["type"];
  const deprecateType = `deprecate_ui_mode::${worstMode}` as GovernanceProposal["type"];

  return [
    {
      id: `gprop-${promoteType}-${assembledAt}`,
      type: promoteType,
      reason: `${winningMode} has the highest marketplace rate in live experiments`,
      priority: "medium",
      advisory: true,
    },
    {
      id: `gprop-${deprecateType}-${assembledAt}`,
      type: deprecateType,
      reason: `${worstMode} is underperforming but retained with minimum exploration`,
      priority: "low",
      advisory: true,
    },
  ];
}

export function buildExperimentationSnapshot(
  adaptation: AdaptationFeedback,
  behaviorMode: AdaptiveUiMode,
  assembledAt: string,
): ExperimentationSnapshot {
  const performanceByMode: ExperimentationPerformance = {
    CONFUSION: adaptation.modes.CONFUSION,
    FRICTION: adaptation.modes.FRICTION,
    ENGAGED: {
      views: adaptation.modes.ENGAGED.views,
      entryRate: adaptation.modes.ENGAGED.entryRate,
      marketplaceRate: adaptation.modes.ENGAGED.marketplaceRate,
      dropOffRate: adaptation.modes.ENGAGED.dropOffRate,
    },
    DEFAULT: adaptation.modes.DEFAULT,
  };

  const hasSamples = hasMinimumExperimentSamples(performanceByMode);
  const winningMode = detectWinningMode(performanceByMode);
  const worstMode = detectWorstMode(performanceByMode);
  const systemState: ExperimentSystemState = hasSamples ? "OPTIMIZING" : "EXPERIMENTING";
  const confidenceLevel = resolveConfidenceLevel(systemState, performanceByMode, winningMode);
  const modeDistribution = computeModeDistribution(systemState, behaviorMode, winningMode);
  const governanceProposals = generateExperimentationGovernanceProposals(
    assembledAt,
    winningMode,
    worstMode,
    systemState,
  );

  return {
    modeDistribution,
    performanceByMode,
    winningMode,
    worstMode,
    confidenceLevel,
    systemState,
    behaviorMode,
    governanceProposals,
  };
}

export function assignExperimentalUiMode(
  sessionId: string,
  behaviorMode: AdaptiveUiMode,
  snapshot: ExperimentationSnapshot,
): ModeAssignment {
  const roll = sessionRoll(sessionId, "assign");

  if (snapshot.systemState === "OPTIMIZING" && snapshot.winningMode) {
    const weights = computeOptimizingWeights(snapshot.winningMode);
    const assignedMode = pickWeightedMode(weights, roll);
    return {
      assignedMode,
      behaviorMode,
      source: "biased",
      experimentation: snapshot,
    };
  }

  if (roll < BEHAVIOR_EXPOSURE_WEIGHT) {
    const assignedMode = behaviorMode === "DEFAULT" ? pickExploreMode(sessionId) : behaviorMode;
    return {
      assignedMode,
      behaviorMode,
      source: "behavior",
      experimentation: snapshot,
    };
  }

  return {
    assignedMode: pickExploreMode(sessionId),
    behaviorMode,
    source: "explore",
    experimentation: snapshot,
  };
}

export function formatExperimentationReport(snapshot: ExperimentationSnapshot): string {
  const distribution = ADAPTIVE_UI_MODES.map(
    (mode) => `${mode}=${snapshot.modeDistribution[mode]}%`,
  ).join(", ");

  const performance = EXPERIMENT_MODES.map((mode) => {
    const metrics = snapshot.performanceByMode[mode];
    return `${mode}: entry=${metrics.entryRate}, marketplace=${metrics.marketplaceRate}, drop_off=${metrics.dropOffRate}, views=${metrics.views}`;
  }).join("; ");

  return [
    "# EXPERIMENTATION_REPORT",
    "## mode_distribution",
    distribution,
    "## performance_by_mode",
    performance,
    "## winning_mode",
    snapshot.winningMode ?? "UNRESOLVED",
    "## confidence_level",
    snapshot.confidenceLevel,
    "## system_state",
    snapshot.systemState,
  ].join("\n");
}
