import type { ApiResult } from "../../lib/apiClient";
import { ttxLocalScenarioService } from "../../lib/ttxLocalScenarioService";
import { ttxSessionService } from "../../lib/ttxSessionService";
import type { TtxLocalScenario, TtxScenarioNode, TtxScenarioSummary } from "../../lib/ttxTypes";
import type { TTXInject, TTXScenario } from "./types";

export function mapBuiltinScenario(summary: TtxScenarioSummary): TTXScenario {
  return {
    id: summary.id,
    title: summary.title,
    summary: `Built-in scenario — ${summary.phaseCount} phases`,
    status: "published",
    injectCount: summary.phaseCount,
    createdAt: new Date(0).toISOString(),
  };
}

export function mapLocalScenario(scenario: TtxLocalScenario): TTXScenario {
  return {
    id: scenario.id,
    title: scenario.title,
    summary: scenario.description ?? "Operator-authored scenario",
    status: "draft",
    injectCount: Object.keys(scenario.nodes).length,
    createdAt: new Date(0).toISOString(),
  };
}

export function localScenarioToInjects(scenario: TtxLocalScenario): TTXInject[] {
  return Object.values(scenario.nodes).map((node: TtxScenarioNode, index) => ({
    id: node.id,
    scenarioId: scenario.id,
    sequence: index + 1,
    title: node.title,
    description: node.inject,
    triggerAtMinutes: (index + 1) * 5,
    severity: "info" as const,
  }));
}

export type MergedScenarioResult = {
  scenarios: TTXScenario[];
  localById: Record<string, TtxLocalScenario>;
};

export async function loadMergedScenarios(): Promise<ApiResult<MergedScenarioResult>> {
  const [builtins, authored] = await Promise.all([
    ttxSessionService.listScenarios(),
    ttxLocalScenarioService.list(),
  ]);

  if (!builtins.ok && !authored.ok) {
    return { ok: false, error: builtins.error || authored.error || "Failed to load scenarios" };
  }

  const scenarios: TTXScenario[] = [];
  const localById: Record<string, TtxLocalScenario> = {};

  if (builtins.ok) {
    scenarios.push(...builtins.data.scenarios.map(mapBuiltinScenario));
  }

  if (authored.ok) {
    for (const scenario of authored.data.scenarios) {
      localById[scenario.id] = scenario;
      scenarios.push(mapLocalScenario(scenario));
    }
  }

  return { ok: true, data: { scenarios, localById }, status: 200 };
}

export async function fetchLocalScenario(id: string): Promise<TtxLocalScenario | null> {
  const result = await ttxLocalScenarioService.list();
  if (!result.ok) return null;
  return result.data.scenarios.find((scenario: TtxLocalScenario) => scenario.id === id) ?? null;
}

export function createEmptyLocalDraft(title: string, summary: string, division?: string): Parameters<typeof ttxLocalScenarioService.create>[0] {
  const entry = "start";
  return {
    title: title.trim(),
    description: summary.trim(),
    roles: division ? [division] : ["operator"],
    entry,
    nodes: {
      [entry]: {
        id: entry,
        title: "Opening inject",
        inject: summary.trim(),
        transitions: [],
      },
    },
  };
}

export function frontendBuildMetadata() {
  return {
    commitSha: typeof __BUILD_COMMIT__ !== "undefined" ? __BUILD_COMMIT__ : "unknown",
    buildTimestamp: typeof __BUILD_TIME__ !== "undefined" ? __BUILD_TIME__ : "",
    appVersion: typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "unknown",
  };
}