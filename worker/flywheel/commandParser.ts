import type { FlywheelActionClass, FlywheelCommand, FlywheelCommandCategory } from "../../shared/flywheel/contracts";
import { FLYWHEEL_STAGE_REGISTRY, stageFromTarget } from "../../shared/flywheel/stages";

const CATEGORIES = new Set<FlywheelCommandCategory>(["ANALYZE", "SCAN", "GENERATE", "SYNTH", "DEPLOY", "LOOP", "PAUSE", "RESUME", "TERMINATE", "REQUEST_EVIDENCE"]);
const PARAMETERS: Record<FlywheelCommandCategory, Set<string>> = {
  ANALYZE: new Set(["HEALTH", "LEADS", "QUALIFY", "OPTIMIZE"]),
  SCAN: new Set(["LEADS"]),
  GENERATE: new Set(["OUTREACH", "CONTENT", "NURTURE", "SALES", "SCALING"]),
  SYNTH: new Set(["QUALIFY", "SALES", "DELIVERY", "IMPROVE"]),
  DEPLOY: new Set(["STAGING", "PRODUCTION"]),
  LOOP: new Set(["OPTIMIZE", "SCALE", "IMPROVE", "NEXT_CYCLE"]),
  PAUSE: new Set(["EXECUTION", "LOWER_AUTONOMY"]),
  RESUME: new Set(["EXECUTION", "NEXT_CYCLE"]),
  TERMINATE: new Set(["MISSION"]),
  REQUEST_EVIDENCE: new Set(["STAGE"]),
};

export type ParsedCommand = Pick<FlywheelCommand, "raw" | "category" | "target" | "parameter" | "actionClass">;
export type CommandParseResult = { ok: true; command: ParsedCommand } | { ok: false; code: string; message: string };

export function actionClassFor(category: FlywheelCommandCategory, target: string): FlywheelActionClass {
  if (category === "DEPLOY") return "C6";
  if (category === "ANALYZE") return "C0";
  if (category === "SCAN" || category === "PAUSE" || category === "REQUEST_EVIDENCE") return "C1";
  if (category === "LOOP" && target === "STAGE_9") return "C3";
  return "C2";
}

export function parseFlywheelCommand(raw: unknown): CommandParseResult {
  if (typeof raw !== "string" || !raw.trim()) return { ok: false, code: "COMMAND_MALFORMED", message: "Command must be a non-empty string." };
  const normalized = raw.trim().toUpperCase();
  const parts = normalized.split("::");
  if (parts.length !== 3 || parts.some((part) => !/^[A-Z0-9_]+$/.test(part))) {
    return { ok: false, code: "COMMAND_MALFORMED", message: "Expected CATEGORY::TARGET::PARAMETER." };
  }
  const [categoryRaw, target, parameter] = parts;
  if (!CATEGORIES.has(categoryRaw as FlywheelCommandCategory)) return { ok: false, code: "COMMAND_UNKNOWN", message: "Command category is not supported." };
  const category = categoryRaw as FlywheelCommandCategory;
  if (target !== "FLYWHEEL" && !stageFromTarget(target)) return { ok: false, code: "COMMAND_TARGET_INVALID", message: "Command target is not registered." };
  if (!PARAMETERS[category].has(parameter)) return { ok: false, code: "COMMAND_PARAMETER_INVALID", message: "Command parameter is not allowed." };
  const stage = stageFromTarget(target);
  if (stage && !stage.acceptedCommands.includes(category) && !["PAUSE", "RESUME", "TERMINATE", "REQUEST_EVIDENCE", "DEPLOY"].includes(category)) {
    return { ok: false, code: "COMMAND_NOT_ACCEPTED", message: `${stage.displayName} does not accept ${category}.` };
  }
  if (target === "FLYWHEEL" && !["ANALYZE", "PAUSE", "RESUME", "TERMINATE", "REQUEST_EVIDENCE", "DEPLOY"].includes(category)) {
    return { ok: false, code: "COMMAND_TARGET_INVALID", message: `${category} requires a stage target.` };
  }
  return { ok: true, command: { raw: normalized, category, target, parameter, actionClass: actionClassFor(category, target) } };
}

export function expectedStageTarget(stageId: string): string {
  const index = FLYWHEEL_STAGE_REGISTRY.findIndex((stage) => stage.stageId === stageId);
  return index < 0 ? "" : `STAGE_${index + 1}`;
}
