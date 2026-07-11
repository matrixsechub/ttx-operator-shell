import type { AdaptiveUiMode } from "./usageModeMetrics";
import {
  type IntentCaptureCategory,
  type IntentCaptureHandoff,
  type IntentCapturePreview,
  type IntentCaptureRecord,
  type IntentCaptureReport,
  type IntentCaptureRollup,
  type IntentCaptureSystemState,
  type IntentInteractionDepth,
} from "./intentCaptureTypes";

export const INTENT_TRIGGER_DWELL_MS = 25_000;
export const INTENT_TRIGGER_SCROLL_DEPTH = 0.5;
export const INTENT_TRIGGER_MIN_CLICKS = 2;

export interface IntentTriggerState {
  dwellMs: number;
  scrollDepth: number;
  clicks: number;
  frictionOnPage: boolean;
  weakExperimentIntent: boolean;
  pageLoadedAt: number;
}

export function evaluateIntentCaptureTrigger(state: IntentTriggerState): boolean {
  if (Date.now() - state.pageLoadedAt < 3_000) return false;
  return (
    state.clicks >= INTENT_TRIGGER_MIN_CLICKS ||
    state.dwellMs > INTENT_TRIGGER_DWELL_MS ||
    state.scrollDepth > INTENT_TRIGGER_SCROLL_DEPTH ||
    state.frictionOnPage ||
    state.weakExperimentIntent
  );
}

function roundRate(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function classifyIntent(intent: string, category?: IntentCaptureCategory): {
  systemType: string;
  path: string;
  riskNote: string;
} {
  const text = intent.toLowerCase();
  const effectiveCategory =
    category ??
    (text.includes("automat") || text.includes("workflow")
      ? "automation"
      : text.includes("agent") || text.includes("chatbot") || text.includes("copilot")
        ? "ai_agent"
        : text.includes("security") || text.includes("audit") || text.includes("compliance")
          ? "security_audit"
          : text.includes("marketplace") || text.includes("module")
            ? "marketplace_module"
            : "general");

  switch (effectiveCategory) {
    case "automation":
      return {
        systemType: "Workflow automation system",
        path: "Scoped automation spec → builder questionnaire → operator-reviewed implementation plan",
        riskNote: "Human approval gates required before any live tool credentials or write actions.",
      };
    case "security_audit":
      return {
        systemType: "Security / compliance advisory system",
        path: "Diagnostic intake → audit-lite or remediation planner → guided fulfillment",
        riskNote: "Advisory only — not a certification or automated compliance attestation.",
      };
    case "marketplace_module":
      return {
        systemType: "Marketplace module engagement",
        path: "Module match → marketplace category → service-assisted fulfillment",
        riskNote: "Module availability and scope confirmed during operator review.",
      };
    case "ai_agent":
    default:
      return {
        systemType: "AI operator agent",
        path: "Intent capture → AI agent builder spec → intake handoff → build queue",
        riskNote: "Agent autonomy bounded by operator approval and tool boundary model.",
      };
  }
}

export function generateIntentPreview(
  intent: string,
  category: IntentCaptureCategory | undefined,
  captureId: string,
  page: string,
): IntentCapturePreview {
  const classified = classifyIntent(intent, category);
  const encodedIntent = encodeURIComponent(intent.slice(0, 240));
  const builderRoute =
    classified.systemType.includes("automation")
      ? `/apps/automation-builder?source_type=intent_capture&source_reference_id=${captureId}&intent=${encodedIntent}`
      : `/apps/ai-agent-builder?source_type=intent_capture&source_reference_id=${captureId}&intent=${encodedIntent}&source_route=${encodeURIComponent(page)}`;

  return {
    problemSummary: intent.trim().slice(0, 280) || "Operator intent pending clarification.",
    suggestedSystemType: classified.systemType,
    implementationPath: classified.path,
    riskTrustNote: classified.riskNote,
    nextAction: "Review the free preview, then unlock the full blueprint or book implementation.",
    builderRoute,
  };
}

export function buildIntentHandoff(
  preview: IntentCapturePreview,
  captureId: string,
  category?: IntentCaptureCategory,
): IntentCaptureHandoff {
  const service =
    category === "automation"
      ? "ai_automation_systems"
      : category === "security_audit"
        ? "security_remediation"
        : "ai_agent_build";

  return {
    unlockBlueprint: preview.builderRoute,
    bookImplementation: `/enter?service=${service}&source=intent-capture&intent_capture_id=${captureId}`,
    exploreMarketplaceModule: `/marketplace?source=intent-capture&ref=${captureId}`,
    requestServiceFulfillment: `/intake?intent=${encodeURIComponent(preview.problemSummary.slice(0, 120))}&intent_capture_id=${captureId}`,
  };
}

export function resolveIntentSystemState(rollup: IntentCaptureRollup): IntentCaptureSystemState {
  if (rollup.captures >= 3) return "CAPTURING_DEMAND";
  return "PASSIVE_TRAFFIC";
}

export function buildIntentCaptureReport(
  rollup: IntentCaptureRollup,
  recent: IntentCaptureRecord[],
  options?: { engagedSessions?: number },
): IntentCaptureReport {
  const denominator = Math.max(options?.engagedSessions ?? 0, rollup.captures, 1);
  const intentRate = rollup.captures > 0 ? roundRate(rollup.captures / denominator) : 0;
  const previewGenerationRate =
    rollup.captures > 0 ? roundRate(rollup.previews / rollup.captures) : 0;
  const handoffRate = rollup.previews > 0 ? roundRate(rollup.handoffs / rollup.previews) : 0;

  const topIntentPages = Object.entries(rollup.byPage)
    .map(([page, count]) => ({ page, count }))
    .sort((left, right) => right.count - left.count)
    .slice(0, 5);

  const topSources = Object.entries(rollup.bySource)
    .map(([source, count]) => ({ source, count }))
    .sort((left, right) => right.count - left.count)
    .slice(0, 5);

  return {
    intentRate,
    previewGenerationRate,
    handoffRate,
    topCapturedIntents: rollup.topIntents.slice(0, 5),
    topIntentPages,
    topSources,
    recentCaptures: recent.slice(0, 10),
    systemState: resolveIntentSystemState(rollup),
  };
}

export function formatIntentCaptureReport(
  report: IntentCaptureReport,
  options: {
    triggerWorking: boolean;
    captureUiLive: boolean;
    apiWorking: boolean;
    builderConnected: boolean;
    handoffActive: boolean;
  },
): string {
  return [
    "# INTENT_CAPTURE_REPORT",
    "## trigger logic",
    options.triggerWorking ? "working" : "broken",
    "## capture UI",
    options.captureUiLive ? "live" : "missing",
    "## API route",
    options.apiWorking ? "working" : "broken",
    "## builder routing",
    options.builderConnected ? "connected" : "disconnected",
    "## commercial handoff",
    options.handoffActive ? "active" : "inactive",
    "## final state",
    report.systemState,
  ].join("\n");
}

export function normalizeInteractionDepth(value: unknown): IntentInteractionDepth {
  const raw = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  return {
    dwellMs: typeof raw.dwellMs === "number" && raw.dwellMs >= 0 ? Math.round(raw.dwellMs) : 0,
    scrollDepth:
      typeof raw.scrollDepth === "number" && raw.scrollDepth >= 0 && raw.scrollDepth <= 1
        ? raw.scrollDepth
        : 0,
    clicks: typeof raw.clicks === "number" && raw.clicks >= 0 ? Math.round(raw.clicks) : 0,
  };
}

export function summarizeIntentForLog(intent: string): string {
  return intent.trim().slice(0, 80);
}

export function bumpTopIntent(
  topIntents: Array<{ text: string; count: number }>,
  intent: string,
): Array<{ text: string; count: number }> {
  const key = summarizeIntentForLog(intent);
  const existing = topIntents.find((entry) => entry.text === key);
  if (existing) {
    existing.count += 1;
  } else {
    topIntents.push({ text: key, count: 1 });
  }
  return topIntents.sort((left, right) => right.count - left.count).slice(0, 20);
}

export function defaultUiMode(value: unknown): AdaptiveUiMode {
  if (value === "CONFUSION" || value === "FRICTION" || value === "ENGAGED" || value === "DEFAULT") {
    return value;
  }
  return "DEFAULT";
}
