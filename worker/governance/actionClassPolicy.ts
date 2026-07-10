import type { ActionClass, ActionProposal } from "./types";
import { ACTION_CLASS_REQUIRES_APPROVAL } from "./types";

export interface ActionClassPolicyResult {
  allowed: boolean;
  code?: string;
  reason: string;
}

const KNOWN_ACTION_TYPES: Record<string, ActionClass> = {
  "activation.campaign.create": "C3",
  "activation.campaign.update": "C3",
  "activation.campaign.activate": "C3",
  "activation.campaign.archive": "C3",
  "governance.safe_mode.enter": "C5",
  "governance.safe_mode.exit": "C5",
};

export function resolveRegisteredActionClass(
  actionType: string,
  declaredClass: ActionClass,
): ActionClassPolicyResult {
  const registered = KNOWN_ACTION_TYPES[actionType];
  if (!registered) {
    return {
      allowed: false,
      code: "UNKNOWN_TARGET_ACTION",
      reason: `Action type not registered in codex: ${actionType}`,
    };
  }
  if (registered !== declaredClass) {
    return {
      allowed: false,
      code: "ACTION_CLASS_MISMATCH",
      reason: `Declared ${declaredClass} does not match registry ${registered} for ${actionType}`,
    };
  }
  return { allowed: true, reason: "Action class matches registry" };
}

export function validateActionClassPolicy(
  proposal: Pick<
    ActionProposal,
    "action_class" | "rollback_plan" | "evidence_refs" | "risk_score" | "summary"
  >,
  options: {
    actionType: string;
    rationale?: string;
    safeModeActive: boolean;
    isContainmentAction?: boolean;
  },
): ActionClassPolicyResult {
  const rank = Number(proposal.action_class.slice(1));
  const registry = resolveRegisteredActionClass(options.actionType, proposal.action_class);
  if (!registry.allowed) return registry;

  if (rank <= 1) {
    return { allowed: true, reason: "C0/C1 advisory or read-only" };
  }

  if (rank >= 3 && !proposal.rollback_plan.trim()) {
    return {
      allowed: false,
      code: "ROLLBACK_PLAN_REQUIRED",
      reason: `${proposal.action_class} requires a non-empty rollback plan`,
    };
  }

  if (rank >= 4 && proposal.evidence_refs.length === 0) {
    return {
      allowed: false,
      code: "TRUST_EVIDENCE_REQUIRED",
      reason: `${proposal.action_class} requires trust-impact evidence references`,
    };
  }

  if (rank >= 5 && !options.rationale?.trim()) {
    return {
      allowed: false,
      code: "OPERATOR_RATIONALE_REQUIRED",
      reason: `${proposal.action_class} requires explicit operator rationale`,
    };
  }

  if (rank >= 6 && options.safeModeActive && !options.isContainmentAction) {
    return {
      allowed: false,
      code: "SAFE_MODE_MUTATION_BLOCKED",
      reason: "C6 destructive actions blocked in safe mode unless containment-approved",
    };
  }

  if (options.safeModeActive && rank >= 2 && rank <= 5 && !options.isContainmentAction) {
    return {
      allowed: false,
      code: "SAFE_MODE_MUTATION_BLOCKED",
      reason: "Mutations blocked while governance safe mode is active",
    };
  }

  return { allowed: true, reason: `${proposal.action_class} policy satisfied` };
}

export function actionClassAllowsMutation(actionClass: ActionClass): boolean {
  return ACTION_CLASS_REQUIRES_APPROVAL[actionClass];
}

export function actionClassRequiresReceipt(actionClass: ActionClass): boolean {
  return ACTION_CLASS_REQUIRES_APPROVAL[actionClass];
}
