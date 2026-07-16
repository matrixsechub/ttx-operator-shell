import type { ActionClass, RuntimeEnvironment } from "../governance/types";
import type { HsxActorType, HsxOperation, HsxScopeGatePacket } from "./types";

const ACTION_CLASSES = new Set<ActionClass>(["C0", "C1", "C2", "C3", "C4", "C5", "C6"]);
const ACTOR_TYPES = new Set<HsxActorType>(["agent", "operator", "system"]);
const OPERATIONS = new Set<HsxOperation>(["read", "create", "update", "delete", "execute", "deploy"]);
const ENVIRONMENTS = new Set<RuntimeEnvironment>(["development", "staging", "production"]);
const SHA256 = /^[a-f0-9]{64}$/;

export type HsxPacketValidation =
  | { valid: true; packet: HsxScopeGatePacket }
  | { valid: false; errors: string[]; packetId: string; correlationId: string };

function objectValue(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function requiredString(source: Record<string, unknown>, key: string, path: string, errors: string[]): string {
  const value = source[key];
  if (typeof value !== "string" || value.trim().length === 0 || value.length > 512) {
    errors.push(`${path}.${key} must be a non-empty string of at most 512 characters`);
    return "";
  }
  return value.trim();
}

function stringArray(source: Record<string, unknown>, key: string, path: string, errors: string[]): string[] {
  const value = source[key];
  if (!Array.isArray(value) || value.length > 100 || value.some((item) => typeof item !== "string" || item.trim().length === 0)) {
    errors.push(`${path}.${key} must be an array of non-empty strings with at most 100 entries`);
    return [];
  }
  return value.map((item) => (item as string).trim());
}

function isoDate(value: string): boolean {
  return value.length > 0 && Number.isFinite(Date.parse(value));
}

function rejectUnexpectedKeys(
  source: Record<string, unknown>,
  allowed: readonly string[],
  path: string,
  errors: string[],
): void {
  const allowedSet = new Set(allowed);
  for (const key of Object.keys(source)) {
    if (!allowedSet.has(key)) errors.push(`${path}.${key} is not allowed`);
  }
}

export function validateHsxScopeGatePacket(value: unknown): HsxPacketValidation {
  const errors: string[] = [];
  const root = objectValue(value);
  if (!root) return { valid: false, errors: ["body must be a JSON object"], packetId: "invalid", correlationId: "invalid" };
  rejectUnexpectedKeys(root, ["version", "packet_id", "correlation_id", "issued_at", "actor", "target", "action", "engagement", "evidence", "approval"], "$", errors);

  const version = requiredString(root, "version", "$", errors);
  const packetId = requiredString(root, "packet_id", "$", errors);
  const correlationId = requiredString(root, "correlation_id", "$", errors);
  const issuedAt = requiredString(root, "issued_at", "$", errors);
  if (version !== "hsx.scope-gate.v1") errors.push("$.version must equal hsx.scope-gate.v1");
  if (!isoDate(issuedAt)) errors.push("$.issued_at must be an ISO-8601 timestamp");

  const actorRaw = objectValue(root.actor);
  const targetRaw = objectValue(root.target);
  const actionRaw = objectValue(root.action);
  const engagementRaw = objectValue(root.engagement);
  if (!actorRaw) errors.push("$.actor must be an object");
  if (!targetRaw) errors.push("$.target must be an object");
  if (!actionRaw) errors.push("$.action must be an object");
  if (!engagementRaw) errors.push("$.engagement must be an object");
  if (actorRaw) rejectUnexpectedKeys(actorRaw, ["id", "type", "roles"], "$.actor", errors);
  if (targetRaw) rejectUnexpectedKeys(targetRaw, ["system", "resource", "environment", "tenant_id"], "$.target", errors);
  if (actionRaw) rejectUnexpectedKeys(actionRaw, ["type", "class", "operation", "permissions", "payload"], "$.action", errors);
  if (engagementRaw) rejectUnexpectedKeys(engagementRaw, ["id", "scope_id", "authorized_targets", "allowed_actions", "allowed_permissions", "expires_at"], "$.engagement", errors);

  const actorId = actorRaw ? requiredString(actorRaw, "id", "$.actor", errors) : "";
  const actorType = actorRaw ? requiredString(actorRaw, "type", "$.actor", errors) : "";
  const actorRoles = actorRaw ? stringArray(actorRaw, "roles", "$.actor", errors) : [];
  if (!ACTOR_TYPES.has(actorType as HsxActorType)) errors.push("$.actor.type is invalid");

  const targetSystem = targetRaw ? requiredString(targetRaw, "system", "$.target", errors) : "";
  const targetResource = targetRaw ? requiredString(targetRaw, "resource", "$.target", errors) : "";
  const targetEnvironment = targetRaw ? requiredString(targetRaw, "environment", "$.target", errors) : "";
  if (!ENVIRONMENTS.has(targetEnvironment as RuntimeEnvironment)) errors.push("$.target.environment is invalid");
  const tenantId = targetRaw?.tenant_id;
  if (tenantId !== undefined && (typeof tenantId !== "string" || tenantId.trim().length === 0)) {
    errors.push("$.target.tenant_id must be a non-empty string when provided");
  }

  const actionType = actionRaw ? requiredString(actionRaw, "type", "$.action", errors) : "";
  const actionClass = actionRaw ? requiredString(actionRaw, "class", "$.action", errors) : "";
  const operation = actionRaw ? requiredString(actionRaw, "operation", "$.action", errors) : "";
  const permissions = actionRaw ? stringArray(actionRaw, "permissions", "$.action", errors) : [];
  const payload = actionRaw ? objectValue(actionRaw.payload) : null;
  if (!ACTION_CLASSES.has(actionClass as ActionClass)) errors.push("$.action.class is invalid");
  if (!OPERATIONS.has(operation as HsxOperation)) errors.push("$.action.operation is invalid");
  if (!payload) errors.push("$.action.payload must be an object");

  const engagementId = engagementRaw ? requiredString(engagementRaw, "id", "$.engagement", errors) : "";
  const scopeId = engagementRaw ? requiredString(engagementRaw, "scope_id", "$.engagement", errors) : "";
  const authorizedTargets = engagementRaw ? stringArray(engagementRaw, "authorized_targets", "$.engagement", errors) : [];
  const allowedActions = engagementRaw ? stringArray(engagementRaw, "allowed_actions", "$.engagement", errors) : [];
  const allowedPermissions = engagementRaw ? stringArray(engagementRaw, "allowed_permissions", "$.engagement", errors) : [];
  const expiresAt = engagementRaw ? requiredString(engagementRaw, "expires_at", "$.engagement", errors) : "";
  if (!isoDate(expiresAt)) errors.push("$.engagement.expires_at must be an ISO-8601 timestamp");

  const evidenceRaw = root.evidence;
  const evidence: HsxScopeGatePacket["evidence"] = [];
  if (!Array.isArray(evidenceRaw) || evidenceRaw.length > 50) {
    errors.push("$.evidence must be an array with at most 50 entries");
  } else {
    evidenceRaw.forEach((item, index) => {
      const record = objectValue(item);
      if (!record) {
        errors.push(`$.evidence[${index}] must be an object`);
        return;
      }
      rejectUnexpectedKeys(record, ["type", "ref", "sha256", "observed_at"], `$.evidence[${index}]`, errors);
      const type = requiredString(record, "type", `$.evidence[${index}]`, errors);
      const ref = requiredString(record, "ref", `$.evidence[${index}]`, errors);
      const observedAt = requiredString(record, "observed_at", `$.evidence[${index}]`, errors);
      const sha256 = record.sha256;
      if (!isoDate(observedAt)) errors.push(`$.evidence[${index}].observed_at must be an ISO-8601 timestamp`);
      if (sha256 !== undefined && (typeof sha256 !== "string" || !SHA256.test(sha256))) {
        errors.push(`$.evidence[${index}].sha256 must be a lowercase SHA-256 digest`);
      }
      evidence.push({ type, ref, observed_at: observedAt, ...(typeof sha256 === "string" ? { sha256 } : {}) });
    });
  }

  const approvalRaw = root.approval === undefined ? undefined : objectValue(root.approval);
  if (root.approval !== undefined && !approvalRaw) errors.push("$.approval must be an object when provided");
  if (approvalRaw) rejectUnexpectedKeys(approvalRaw, ["proposal_id", "approval_id"], "$.approval", errors);
  const proposalId = approvalRaw ? requiredString(approvalRaw, "proposal_id", "$.approval", errors) : "";
  const approvalId = approvalRaw ? requiredString(approvalRaw, "approval_id", "$.approval", errors) : "";

  if (errors.length > 0) return { valid: false, errors, packetId: packetId || "invalid", correlationId: correlationId || "invalid" };

  return {
    valid: true,
    packet: {
      version: "hsx.scope-gate.v1",
      packet_id: packetId,
      correlation_id: correlationId,
      issued_at: issuedAt,
      actor: { id: actorId, type: actorType as HsxActorType, roles: actorRoles },
      target: {
        system: targetSystem,
        resource: targetResource,
        environment: targetEnvironment as RuntimeEnvironment,
        ...(typeof tenantId === "string" ? { tenant_id: tenantId.trim() } : {}),
      },
      action: {
        type: actionType,
        class: actionClass as ActionClass,
        operation: operation as HsxOperation,
        permissions,
        payload: payload ?? {},
      },
      engagement: {
        id: engagementId,
        scope_id: scopeId,
        authorized_targets: authorizedTargets,
        allowed_actions: allowedActions,
        allowed_permissions: allowedPermissions,
        expires_at: expiresAt,
      },
      evidence,
      ...(approvalRaw ? { approval: { proposal_id: proposalId, approval_id: approvalId } } : {}),
    },
  };
}
