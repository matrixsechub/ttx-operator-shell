import type {
  FlowFrictionPoint,
  FlowRecommendation,
  FrictionRuleId,
} from "./flowTypes";

interface RecommendationTemplate {
  issue: string;
  suggestedChange: string;
  impactScore: number;
  confidenceScore: number;
  effortEstimate: FlowRecommendation["effortEstimate"];
}

const RECOMMENDATION_MAP: Record<FrictionRuleId, RecommendationTemplate[]> = {
  high_exit_trap: [
    {
      issue: "Users leave after landing without progressing",
      suggestedChange: "Simplify hero copy and clarify the primary next step",
      impactScore: 8,
      confidenceScore: 0.75,
      effortEstimate: "low",
    },
    {
      issue: "High exit concentration on entry surface",
      suggestedChange: "Add next-step framing above the fold",
      impactScore: 7,
      confidenceScore: 0.7,
      effortEstimate: "medium",
    },
  ],
  dwell_no_action: [
    {
      issue: "Long dwell time without meaningful interaction",
      suggestedChange: "Shorten page length and surface one primary action",
      impactScore: 7,
      confidenceScore: 0.68,
      effortEstimate: "medium",
    },
    {
      issue: "Users read but do not engage",
      suggestedChange: "Add trust proof near the main content block",
      impactScore: 6,
      confidenceScore: 0.65,
      effortEstimate: "low",
    },
  ],
  navigation_loop: [
    {
      issue: "Users oscillate between pages without resolving intent",
      suggestedChange: "Reduce competing navigation paths and unify CTA targets",
      impactScore: 8,
      confidenceScore: 0.72,
      effortEstimate: "medium",
    },
  ],
  cta_impression_gap: [
    {
      issue: "CTAs are seen but rarely clicked",
      suggestedChange: "Improve button prominence and contrast on primary CTA",
      impactScore: 8,
      confidenceScore: 0.78,
      effortEstimate: "low",
    },
    {
      issue: "Too many CTAs compete for attention",
      suggestedChange: "Reduce CTA competition to one hero action per viewport",
      impactScore: 7,
      confidenceScore: 0.74,
      effortEstimate: "low",
    },
  ],
  click_no_progression: [
    {
      issue: "Clicks do not convert into forward navigation",
      suggestedChange: "Add next-step framing after interactive elements",
      impactScore: 7,
      confidenceScore: 0.7,
      effortEstimate: "medium",
    },
  ],
  form_abandon: [
    {
      issue: "Forms are started but often abandoned",
      suggestedChange: "Move intent capture earlier with fewer required fields",
      impactScore: 9,
      confidenceScore: 0.8,
      effortEstimate: "medium",
    },
  ],
};

export function generateFlowRecommendations(frictionPoints: FlowFrictionPoint[]): FlowRecommendation[] {
  const recommendations: FlowRecommendation[] = [];

  for (const point of frictionPoints) {
    const templates = RECOMMENDATION_MAP[point.ruleId];
    const template = templates[0];
    if (!template) continue;

    recommendations.push({
      page: point.page,
      issue: template.issue,
      suggestedChange: template.suggestedChange,
      impactScore: template.impactScore,
      confidenceScore: Math.min(1, template.confidenceScore * (point.severity === "high" ? 1 : 0.85)),
      effortEstimate: template.effortEstimate,
    });
  }

  return recommendations
    .sort((left, right) => right.impactScore * right.confidenceScore - left.impactScore * left.confidenceScore)
    .filter((rec, index, list) => list.findIndex((entry) => entry.page === rec.page && entry.suggestedChange === rec.suggestedChange) === index);
}
