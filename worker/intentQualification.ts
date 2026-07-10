import { generateIntentPreview } from "./intentCapture";
import type { IntentCaptureRecord } from "./intentCaptureTypes";
import {
  INTENT_QUALIFICATION_GOVERNANCE,
  summarizeIntentText,
} from "./intentQualificationGovernance";
import {
  INTENT_QUALIFICATION_PRIORITIES,
  INTENT_QUALIFICATION_TYPES,
  type IntentQualificationAdvisoryProposal,
  type IntentQualificationClassification,
  type IntentQualificationInput,
  type IntentQualificationPriority,
  type IntentQualificationRecord,
  type IntentQualificationReport,
  type IntentQualificationRollup,
  type IntentQualificationRouting,
  type IntentQualificationScoreBreakdown,
  type IntentQualificationSystemState,
  type IntentQualificationType,
} from "./intentQualificationTypes";

const AUTOMATION_KEYWORDS = ["automat", "workflow", "zapier", "n8n", "integrat", "trigger", "webhook"];
const AGENT_KEYWORDS = ["agent", "chatbot", "copilot", "assistant", "llm", "gpt", "bot"];
const SECURITY_KEYWORDS = ["security", "audit", "vulnerab", "penetration", "pentest", "cve", "exploit"];
const COMPLIANCE_KEYWORDS = ["compliance", "soc2", "soc 2", "hipaa", "gdpr", "nist", "fedramp", "iso"];
const MARKETPLACE_KEYWORDS = ["marketplace", "module", "catalog", "sku", "product"];
const CONSULT_KEYWORDS = ["consult", "advisory", "help me", "implement", "build for", "hire", "service"];
const ENTERPRISE_KEYWORDS = ["enterprise", "fed-grade", "fedgrade", "governance", "readiness", "regulated", "mission-critical"];

function clampInt(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(value)));
}

function clampScore(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function textSignals(intent: string): string {
  return intent.toLowerCase();
}

function countKeywordHits(text: string, keywords: string[]): number {
  return keywords.reduce((count, keyword) => (text.includes(keyword) ? count + 1 : count), 0);
}

function categoryToIntentType(category: IntentCaptureRecord["category"]): IntentQualificationType | null {
  switch (category) {
    case "automation":
      return "automation_build";
    case "ai_agent":
      return "ai_agent_build";
    case "security_audit":
      return "security_audit";
    case "marketplace_module":
      return "marketplace_module";
    case "general":
      return null;
    default:
      return null;
  }
}

export function classifyIntentType(input: IntentQualificationInput): IntentQualificationClassification {
  const text = textSignals(input.record.intent);
  const previewType = (input.previewSystemType ?? "").toLowerCase();

  const fromCategory = categoryToIntentType(input.record.category);
  if (fromCategory) {
    return {
      intentType: fromCategory,
      classificationConfidence: 0.92,
      rationale: `Capture category "${input.record.category}" maps directly to ${fromCategory}.`,
    };
  }

  const scores: Array<{ type: IntentQualificationType; score: number; reason: string }> = [
    {
      type: "enterprise_readiness",
      score: countKeywordHits(text, ENTERPRISE_KEYWORDS) * 3 + countKeywordHits(text, COMPLIANCE_KEYWORDS),
      reason: "enterprise or governance readiness language",
    },
    {
      type: "security_audit",
      score: countKeywordHits(text, SECURITY_KEYWORDS) * 2 + countKeywordHits(text, COMPLIANCE_KEYWORDS),
      reason: "security or compliance diagnostic language",
    },
    {
      type: "automation_build",
      score: countKeywordHits(text, AUTOMATION_KEYWORDS) * 2 + (previewType.includes("automation") ? 2 : 0),
      reason: "workflow automation language",
    },
    {
      type: "ai_agent_build",
      score: countKeywordHits(text, AGENT_KEYWORDS) * 2 + (previewType.includes("agent") ? 2 : 0),
      reason: "AI agent or assistant language",
    },
    {
      type: "marketplace_module",
      score: countKeywordHits(text, MARKETPLACE_KEYWORDS) * 2,
      reason: "marketplace module engagement language",
    },
    {
      type: "service_consultation",
      score: countKeywordHits(text, CONSULT_KEYWORDS) * 2,
      reason: "implementation or advisory service language",
    },
  ];

  scores.sort((left, right) => right.score - left.score);
  const top = scores[0]!;
  const runnerUp = scores[1]?.score ?? 0;

  if (top.score <= 0) {
    return {
      intentType: "unknown",
      classificationConfidence: 0.35,
      rationale: "Insufficient category or keyword signal; intent requires operator review.",
    };
  }

  const margin = top.score - runnerUp;
  const confidence = clampScore(0.55 + top.score * 0.08 + margin * 0.05, 0.4, 0.98);

  if (top.type === "enterprise_readiness" && countKeywordHits(text, SECURITY_KEYWORDS) > 0 && margin < 2) {
    return {
      intentType: "security_audit",
      classificationConfidence: clampScore(confidence, 0.5, 0.9),
      rationale: "Security audit signals dominate over generic enterprise readiness language.",
    };
  }

  return {
    intentType: top.type,
    classificationConfidence: confidence,
    rationale: `Keyword and preview signals indicate ${top.type} (${top.reason}).`,
  };
}

function scoreProblemClarity(intent: string): number {
  const trimmed = intent.trim();
  if (trimmed.length < 12) return 4;
  let score = 8;
  if (trimmed.length >= 40) score += 4;
  if (trimmed.length >= 120) score += 3;
  if (/\d/.test(trimmed)) score += 2;
  if (/(need|want|must|require|reduce|improve|automate|build|deploy)/i.test(trimmed)) score += 3;
  return clampInt(score, 0, 20);
}

function scoreImplementationFit(intentType: IntentQualificationType, record: IntentCaptureRecord): number {
  const base: Record<IntentQualificationType, number> = {
    automation_build: 14,
    ai_agent_build: 16,
    security_audit: 15,
    marketplace_module: 12,
    service_consultation: 10,
    enterprise_readiness: 8,
    unknown: 4,
  };
  let score = base[intentType];
  if (record.previewGenerated) score += 3;
  if (record.page.startsWith("/apps/")) score += 2;
  return clampInt(score, 0, 20);
}

function scoreRevenuePotential(intent: string, intentType: IntentQualificationType): number {
  const text = textSignals(intent);
  let score = 6;
  if (countKeywordHits(text, ENTERPRISE_KEYWORDS) > 0) score += 6;
  if (countKeywordHits(text, COMPLIANCE_KEYWORDS) > 0) score += 4;
  if (/(budget|contract|retainer|team|department|org)/i.test(text)) score += 4;
  if (intentType === "enterprise_readiness" || intentType === "security_audit") score += 3;
  if (intentType === "service_consultation") score += 2;
  return clampInt(score, 0, 20);
}

function scoreUrgency(intent: string, record: IntentCaptureRecord): number {
  const text = textSignals(intent);
  let score = 3;
  if (/(asap|urgent|deadline|this week|immediately|today)/i.test(text)) score += 8;
  if (/(this month|soon|priority)/i.test(text)) score += 4;
  if (record.interactionDepth.dwellMs >= 60_000) score += 2;
  if (record.interactionDepth.clicks >= 4) score += 2;
  return clampInt(score, 0, 15);
}

function scoreReusability(intent: string, intentType: IntentQualificationType): number {
  const text = textSignals(intent);
  let score = 5;
  if (intentType === "automation_build" || intentType === "ai_agent_build") score += 5;
  if (/(template|repeatable|standard|playbook|pattern)/i.test(text)) score += 4;
  if (/(one-off|custom only|unique)/i.test(text)) score -= 3;
  return clampInt(score, 0, 15);
}

function scoreSecurityCompliance(intent: string, intentType: IntentQualificationType): number {
  const text = textSignals(intent);
  let score = intentType === "security_audit" || intentType === "enterprise_readiness" ? 6 : 2;
  score += countKeywordHits(text, COMPLIANCE_KEYWORDS) * 2;
  score += countKeywordHits(text, SECURITY_KEYWORDS);
  return clampInt(score, 0, 10);
}

export function scoreIntentQualification(
  input: IntentQualificationInput,
  classification: IntentQualificationClassification,
): { breakdown: IntentQualificationScoreBreakdown; totalScore: number; priority: IntentQualificationPriority } {
  const breakdown: IntentQualificationScoreBreakdown = {
    problemClarity: scoreProblemClarity(input.record.intent),
    implementationFit: scoreImplementationFit(classification.intentType, input.record),
    revenuePotential: scoreRevenuePotential(input.record.intent, classification.intentType),
    urgency: scoreUrgency(input.record.intent, input.record),
    reusability: scoreReusability(input.record.intent, classification.intentType),
    securityCompliance: scoreSecurityCompliance(input.record.intent, classification.intentType),
  };

  const totalScore = clampInt(
    breakdown.problemClarity +
      breakdown.implementationFit +
      breakdown.revenuePotential +
      breakdown.urgency +
      breakdown.reusability +
      breakdown.securityCompliance,
    0,
    100,
  );

  const priority: IntentQualificationPriority =
    totalScore >= 70 ? "high" : totalScore >= 40 ? "medium" : "low";

  return { breakdown, totalScore, priority };
}

function builderRouteWithHandoff(
  baseRoute: string,
  captureId: string,
  intent: string,
  sourceRoute: string,
): string {
  const params = new URLSearchParams({
    source_type: "intent_capture",
    source_reference_id: captureId,
    intent: intent.slice(0, 240),
    source_route: sourceRoute,
  });
  return `${baseRoute}?${params.toString()}`;
}

export function routeQualifiedIntent(
  input: IntentQualificationInput,
  classification: IntentQualificationClassification,
  _totalScore: number,
  priority: IntentQualificationPriority,
): IntentQualificationRouting {
  const { record } = input;
  const captureId = record.captureId;
  const intent = record.intent;
  const sourceRoute = record.page;

  if (classification.intentType === "unknown" && priority === "low") {
    return {
      recommendedRoute: "/enter",
      recommendedOffer: "nurture_followup",
      nextCtaLabel: "Continue exploring services",
      routingRationale: "Low-signal intent held in nurture queue until clearer demand emerges.",
      routeKind: "nurture",
    };
  }

  if (
    priority === "high" &&
    (classification.intentType === "unknown" ||
      classification.intentType === "enterprise_readiness" ||
      classification.classificationConfidence < 0.6)
  ) {
    return {
      recommendedRoute: "/dashboard",
      recommendedOffer: "operator_review_queue",
      nextCtaLabel: "Route to operator review",
      routingRationale:
        "High-value or ambiguous opportunity routed to operator review instead of blind automation.",
      routeKind: "operator_review",
    };
  }

  switch (classification.intentType) {
    case "automation_build":
      if (priority === "high" && classification.classificationConfidence < 0.75) {
        return {
          recommendedRoute: "/dashboard",
          recommendedOffer: "operator_review_queue",
          nextCtaLabel: "Operator review before automation scoping",
          routingRationale:
            "Automation generation remains bounded; high-value ambiguous automation demand goes to operator review.",
          routeKind: "operator_review",
        };
      }
      return {
        recommendedRoute: builderRouteWithHandoff(
          "/apps/automation-builder",
          captureId,
          intent,
          sourceRoute,
        ),
        recommendedOffer: "automation_builder_intake",
        nextCtaLabel: "Open automation builder",
        routingRationale: "Automation intent maps to live automation builder intake (bounded spec generation).",
        routeKind: "builder",
      };
    case "ai_agent_build":
      return {
        recommendedRoute: builderRouteWithHandoff("/apps/ai-agent-builder", captureId, intent, sourceRoute),
        recommendedOffer: "ai_agent_builder_intake",
        nextCtaLabel: "Open AI agent builder",
        routingRationale: "Agent intent maps to live AI agent builder with intent-capture handoff params.",
        routeKind: "builder",
      };
    case "security_audit":
      return {
        recommendedRoute: builderRouteWithHandoff(
          "/apps/cloudflare-security-audit-lite",
          captureId,
          intent,
          sourceRoute,
        ),
        recommendedOffer: "security_audit_lite",
        nextCtaLabel: "Start security audit lite",
        routingRationale: "Security or compliance diagnostic routed to audit-lite surface.",
        routeKind: "builder",
      };
    case "marketplace_module":
      return {
        recommendedRoute: `/marketplace?source=intent-qualification&ref=${captureId}`,
        recommendedOffer: "marketplace_module_match",
        nextCtaLabel: "Explore matching marketplace module",
        routingRationale: "Module-oriented demand routed to marketplace discovery with capture reference.",
        routeKind: "marketplace",
      };
    case "service_consultation":
      return {
        recommendedRoute: `/enter?service=ai_agent_build&source=intent-qualification&intent_capture_id=${captureId}`,
        recommendedOffer: "implementation_booking",
        nextCtaLabel: "Book implementation intake",
        routingRationale: "Consultation-oriented intent routed to implementation booking intake.",
        routeKind: "implementation_booking",
      };
    case "enterprise_readiness":
      return {
        recommendedRoute: "/dashboard",
        recommendedOffer: "operator_review_queue",
        nextCtaLabel: "Operator readiness review",
        routingRationale: "Enterprise readiness demand requires governed operator follow-up.",
        routeKind: "operator_review",
      };
    case "unknown":
      return {
        recommendedRoute: "/enter",
        recommendedOffer: "nurture_followup",
        nextCtaLabel: "Clarify requirements",
        routingRationale: "Unclassified intent held for nurture and clarification.",
        routeKind: "nurture",
      };
    default: {
      const _exhaustive: never = classification.intentType;
      void _exhaustive;
      return {
        recommendedRoute: "/enter",
        recommendedOffer: "nurture_followup",
        nextCtaLabel: "Clarify requirements",
        routingRationale: "Unclassified intent held for nurture and clarification.",
        routeKind: "nurture",
      };
    }
  }
}

export function buildAdvisoryProposals(
  qualified: IntentQualificationRecord,
  rollup: IntentQualificationRollup,
): IntentQualificationAdvisoryProposal[] {
  const proposals: IntentQualificationAdvisoryProposal[] = [];

  if (qualified.priority === "high") {
    proposals.push({
      id: `prioritize_operator_followup::${qualified.captureId}`,
      type: `prioritize_operator_followup::${qualified.captureId}`,
      reason: `High-priority capture (${qualified.totalScore}/100) needs operator follow-up.`,
      priority: "high",
      advisory: true,
      governance: INTENT_QUALIFICATION_GOVERNANCE,
    });
  }

  if (qualified.routing.routeKind === "builder") {
    const builder = qualified.routing.recommendedRoute.split("?")[0] ?? qualified.routing.recommendedRoute;
    proposals.push({
      id: `route_more_traffic_to::${builder}`,
      type: `route_more_traffic_to::${builder}`,
      reason: `Qualified ${qualified.classification.intentType} demand fits ${builder}.`,
      priority: qualified.priority,
      advisory: true,
      governance: INTENT_QUALIFICATION_GOVERNANCE,
    });
  }

  const pageCount = rollup.bySource[qualified.source] ?? 0;
  if (pageCount >= 2) {
    proposals.push({
      id: `increase_capture_on::${qualified.page}`,
      type: `increase_capture_on::${qualified.page}`,
      reason: `Repeat demand from ${qualified.page} suggests stronger capture placement.`,
      priority: "medium",
      advisory: true,
      governance: INTENT_QUALIFICATION_GOVERNANCE,
    });
  }

  if (qualified.classification.intentType === "marketplace_module") {
    proposals.push({
      id: `expand_module::${qualified.category ?? "general"}`,
      type: `expand_module::${qualified.category ?? "general"}`,
      reason: "Marketplace module interest may justify module surface expansion.",
      priority: qualified.priority,
      advisory: true,
      governance: INTENT_QUALIFICATION_GOVERNANCE,
    });
  }

  if (qualified.totalScore >= 55) {
    proposals.push({
      id: `promote_offer::${qualified.routing.recommendedOffer}`,
      type: `promote_offer::${qualified.routing.recommendedOffer}`,
      reason: `Score ${qualified.totalScore} supports promoting ${qualified.routing.recommendedOffer}.`,
      priority: qualified.priority,
      advisory: true,
      governance: INTENT_QUALIFICATION_GOVERNANCE,
    });
  }

  if (qualified.priority !== "low" && qualified.classification.intentType !== "unknown") {
    proposals.push({
      id: `package_as_marketplace_asset::${qualified.classification.intentType}`,
      type: `package_as_marketplace_asset::${qualified.classification.intentType}`,
      reason: "Reusable fulfillment pattern may be productized as marketplace asset.",
      priority: "medium",
      advisory: true,
      governance: INTENT_QUALIFICATION_GOVERNANCE,
    });
  }

  return proposals;
}

export function qualifyCapturedIntent(record: IntentCaptureRecord): IntentQualificationRecord {
  const preview = generateIntentPreview(record.intent, record.category, record.captureId, record.page);
  const input: IntentQualificationInput = {
    record,
    previewSystemType: preview.suggestedSystemType,
    handoffUnlockRoute: preview.builderRoute,
  };

  const classification = classifyIntentType(input);
  const { breakdown, totalScore, priority } = scoreIntentQualification(input, classification);
  const routing = routeQualifiedIntent(input, classification, totalScore, priority);

  const qualified: IntentQualificationRecord = {
    captureId: record.captureId,
    sessionId: record.sessionId,
    source: record.source,
    page: record.page,
    category: record.category,
    intent: record.intent,
    sourceRoute: record.page,
    timestamp: record.timestamp,
    classification,
    score: breakdown,
    totalScore,
    priority,
    routing,
    proposalIds: [],
    qualifiedAt: new Date().toISOString(),
    intentSummary: summarizeIntentText(record.intent),
    governance: INTENT_QUALIFICATION_GOVERNANCE,
    testRunId:
      record.experimentId?.startsWith("intent-qualification-") ? record.experimentId : undefined,
  };

  return qualified;
}

export function resolveQualificationSystemState(
  rollup: IntentQualificationRollup,
  pendingCaptures: number,
): IntentQualificationSystemState {
  if (rollup.qualified >= 5 && (rollup.byPriority.high ?? 0) > 0) {
    return "QUALIFIED_PIPELINE";
  }
  if (rollup.qualified > 0 || pendingCaptures > 0) {
    return "QUALIFYING";
  }
  return "RAW_DEMAND";
}

export function buildIntentQualificationReport(
  rollup: IntentQualificationRollup,
  qualifiedRecords: IntentQualificationRecord[],
  proposals: IntentQualificationAdvisoryProposal[],
  pendingCaptures: number,
): IntentQualificationReport {
  const countsByType = { ...rollup.byType };
  const countsByPriority = { ...rollup.byPriority };

  const topSources = Object.entries(rollup.bySource)
    .map(([source, count]) => ({ source, count }))
    .sort((left, right) => right.count - left.count)
    .slice(0, 5);

  const topRoutes = Object.entries(rollup.byRoute)
    .map(([route, count]) => ({ route, count }))
    .sort((left, right) => right.count - left.count)
    .slice(0, 5);

  const topRecommendedOffers = Object.entries(rollup.byOffer)
    .map(([offer, count]) => ({ offer, count }))
    .sort((left, right) => right.count - left.count)
    .slice(0, 5);

  const topPages = Object.entries(rollup.byPage)
    .map(([page, count]) => ({ page, count }))
    .sort((left, right) => right.count - left.count)
    .slice(0, 5);

  const topQualifiedIntents = [...qualifiedRecords]
    .sort((left, right) => right.totalScore - left.totalScore)
    .slice(0, 10)
    .map(redactQualificationRecordForReport);

  return {
    qualifiedTotal: rollup.qualified,
    topQualifiedIntents,
    countsByType,
    countsByPriority,
    topSources,
    topPages,
    topRoutes,
    topRecommendedOffers,
    advisoryProposals: proposals.slice(0, 20),
    systemState: resolveQualificationSystemState(rollup, pendingCaptures),
    updatedAt: rollup.updatedAt,
    governance: INTENT_QUALIFICATION_GOVERNANCE,
  };
}

export function redactQualificationRecordForReport(
  record: IntentQualificationRecord,
): IntentQualificationRecord {
  return {
    ...record,
    intent: record.intentSummary,
  };
}

export function formatIntentQualificationReport(report: IntentQualificationReport): string {
  return [
    "# INTENT_QUALIFICATION_REPORT",
    "## ingestion",
    report.topQualifiedIntents.length > 0 || report.systemState !== "RAW_DEMAND" ? "working" : "broken",
    "## classification",
    Object.keys(report.countsByType).length > 0 ? "working" : "broken",
    "## scoring",
    report.topQualifiedIntents.some((entry) => entry.totalScore > 0) ? "working" : "broken",
    "## routing",
    report.topRoutes.length > 0 ? "working" : "broken",
    "## advisory proposals",
    report.advisoryProposals.length > 0 ? "working" : "broken",
    "## cockpit visibility",
    "visible",
    "## final state",
    report.systemState,
  ].join("\n");
}

export function bumpTopQualified(
  topQualified: IntentQualificationRollup["topQualified"],
  record: IntentQualificationRecord,
): IntentQualificationRollup["topQualified"] {
  const next = topQualified.filter((entry) => entry.captureId !== record.captureId);
  next.push({
    captureId: record.captureId,
    intentSummary: record.intentSummary,
    totalScore: record.totalScore,
    priority: record.priority,
  });
  return next.sort((left, right) => right.totalScore - left.totalScore).slice(0, 20);
}

export function mergeRollupWithQualification(
  rollup: IntentQualificationRollup,
  record: IntentQualificationRecord,
): IntentQualificationRollup {
  const next = { ...rollup, byType: { ...rollup.byType }, byPriority: { ...rollup.byPriority } };
  next.qualified += 1;
  next.byType[record.classification.intentType] = (next.byType[record.classification.intentType] ?? 0) + 1;
  next.byPriority[record.priority] = (next.byPriority[record.priority] ?? 0) + 1;
  next.bySource[record.source] = (next.bySource[record.source] ?? 0) + 1;
  next.byPage[record.page] = (next.byPage[record.page] ?? 0) + 1;
  next.byRoute[record.routing.recommendedRoute] = (next.byRoute[record.routing.recommendedRoute] ?? 0) + 1;
  next.byOffer[record.routing.recommendedOffer] = (next.byOffer[record.routing.recommendedOffer] ?? 0) + 1;
  next.topQualified = bumpTopQualified(next.topQualified, record);
  next.updatedAt = new Date().toISOString();
  return next;
}

export function isValidQualificationType(value: unknown): value is IntentQualificationType {
  return typeof value === "string" && (INTENT_QUALIFICATION_TYPES as readonly string[]).includes(value);
}

export function isValidQualificationPriority(value: unknown): value is IntentQualificationPriority {
  return typeof value === "string" && (INTENT_QUALIFICATION_PRIORITIES as readonly string[]).includes(value);
}
