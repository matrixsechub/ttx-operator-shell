import northstarV2Document from "./northstar-v2.json" with { type: "json" };
import {
  BEACON_AXIS_ORDER,
  BeaconValidationError,
  validateBeaconDocument,
  type Beacon,
  type BeaconAxis,
} from "./beaconSchema";

export type BeaconV2State = "ACTIVE";
export type AutonomyLevel = "A0" | "A1" | "A2" | "A3" | "A4" | "A5" | "A6";
export type OperatorMode =
  | "normal"
  | "cautious"
  | "incident"
  | "revenue_validation"
  | "ghost_lab"
  | "audit";

export interface BeaconActionClassRule {
  description: string;
  approval_required: boolean;
}

export interface BeaconAutonomyLevelRule {
  name: string;
  description: string;
}

export interface BeaconRecursionLimits {
  max_reasoning_depth: number;
  max_scenario_branches: number;
  max_agent_debate_rounds: number;
  max_tool_call_chain_length: number;
  max_unresolved_loop_retries: number;
}

export interface BeaconV2 extends Beacon {
  version: 2;
  action_classes: Record<string, BeaconActionClassRule>;
  autonomy_levels: Record<string, BeaconAutonomyLevelRule>;
  recursion_limits: BeaconRecursionLimits;
  operator_modes: OperatorMode[];
  approval_policy: {
    human_only_actions: string[];
    beacon_hash_required: true;
  };
}

export function validateBeaconV2Document(raw: unknown): BeaconV2 {
  const base = validateBeaconDocument(raw);
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new BeaconValidationError("Beacon v2 document must be an object");
  }
  const doc = raw as Record<string, unknown>;
  if (doc.version !== 2) {
    throw new BeaconValidationError('version must be 2 for Beacon v2 documents');
  }

  const action_classes = doc.action_classes;
  if (!action_classes || typeof action_classes !== "object" || Array.isArray(action_classes)) {
    throw new BeaconValidationError("action_classes must be an object");
  }

  const autonomy_levels = doc.autonomy_levels;
  if (!autonomy_levels || typeof autonomy_levels !== "object" || Array.isArray(autonomy_levels)) {
    throw new BeaconValidationError("autonomy_levels must be an object");
  }

  const recursion_limits = doc.recursion_limits;
  if (!recursion_limits || typeof recursion_limits !== "object" || Array.isArray(recursion_limits)) {
    throw new BeaconValidationError("recursion_limits must be an object");
  }

  const operator_modes = doc.operator_modes;
  if (!Array.isArray(operator_modes)) {
    throw new BeaconValidationError("operator_modes must be an array");
  }

  const approval_policy = doc.approval_policy;
  if (!approval_policy || typeof approval_policy !== "object" || Array.isArray(approval_policy)) {
    throw new BeaconValidationError("approval_policy must be an object");
  }

  return {
    ...base,
    version: 2,
    action_classes: action_classes as Record<string, BeaconActionClassRule>,
    autonomy_levels: autonomy_levels as Record<string, BeaconAutonomyLevelRule>,
    recursion_limits: recursion_limits as BeaconRecursionLimits,
    operator_modes: operator_modes as OperatorMode[],
    approval_policy: approval_policy as BeaconV2["approval_policy"],
  };
}

export function getBeaconV2Draft(): BeaconV2 {
  return validateBeaconV2Document(northstarV2Document);
}

export { BEACON_AXIS_ORDER, type BeaconAxis };
