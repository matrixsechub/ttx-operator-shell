import sourceRegistryDocument from "./sourceRegistry.json" with { type: "json" };
import { BEACON_AXIS_ORDER, validateBeaconDocument } from "../beacon/beaconSchema";
import { loadBeacon } from "../beacon/loadBeacon";
import type {
  McpGovernancePayload,
  McpPayloadType,
  McpSourceRegistry,
  McpSourceRegistryEntry,
  McpValidationResult,
} from "./proposalTypes";

export class McpValidationError extends Error {
  constructor(
    message: string,
    readonly errors: string[] = [message],
  ) {
    super(message);
    this.name = "McpValidationError";
  }
}

const registry = Object.freeze(sourceRegistryDocument as McpSourceRegistry);

export function getMcpSourceRegistry(): Readonly<McpSourceRegistry> {
  return registry;
}

export function getMcpSourceEntry(sourceId: string): McpSourceRegistryEntry | undefined {
  return registry.sources.find((entry) => entry.id === sourceId);
}

function assertNonEmptyString(value: unknown, field: string, errors: string[]): string | null {
  if (typeof value !== "string" || value.trim().length === 0) {
    errors.push(`${field} must be a non-empty string`);
    return null;
  }
  return value.trim();
}

function parsePayloadType(value: unknown, errors: string[]): McpPayloadType | null {
  if (value !== "northstar-update" && value !== "governance-signal") {
    errors.push('payloadType must be "northstar-update" or "governance-signal"');
    return null;
  }
  return value;
}

function validateGovernanceSignal(raw: unknown, errors: string[]): void {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    errors.push("signal must be an object for governance-signal payloads");
    return;
  }
  const signal = raw as Record<string, unknown>;
  const message = assertNonEmptyString(signal.message, "signal.message", errors);
  if (!message) return;

  if (signal.axis !== undefined) {
    const axis = assertNonEmptyString(signal.axis, "signal.axis", errors);
    if (axis && !(BEACON_AXIS_ORDER as readonly string[]).includes(axis)) {
      errors.push(`signal.axis must be one of: ${BEACON_AXIS_ORDER.join(", ")}`);
    }
  }

  if (signal.priorityIndex !== undefined) {
    if (
      typeof signal.priorityIndex !== "number" ||
      !Number.isInteger(signal.priorityIndex) ||
      signal.priorityIndex < 0 ||
      signal.priorityIndex > 5
    ) {
      errors.push("signal.priorityIndex must be an integer between 0 and 5");
    }
  }

  if (signal.severity !== undefined) {
    const allowed = ["info", "low", "medium", "high"];
    if (typeof signal.severity !== "string" || !allowed.includes(signal.severity)) {
      errors.push('signal.severity must be one of: info, low, medium, high');
    }
  }
}

function validateAgainstCurrentBeacon(proposedBeacon: unknown, errors: string[]): void {
  try {
    const validated = validateBeaconDocument(proposedBeacon);
    const current = loadBeacon().beacon;
    if (JSON.stringify(validated) === JSON.stringify(current)) {
      errors.push("proposedBeacon is identical to the active beacon — no update required");
    }
  } catch (error) {
    errors.push(error instanceof Error ? error.message : "proposedBeacon failed beacon schema validation");
  }
}

export function validateMcpPayload(raw: unknown): McpValidationResult {
  const errors: string[] = [];

  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { valid: false, errors: ["MCP payload must be an object"] };
  }

  const doc = raw as Record<string, unknown>;
  const sourceId = assertNonEmptyString(doc.sourceId, "sourceId", errors);
  const payloadType = parsePayloadType(doc.payloadType, errors);
  const proposedAt = assertNonEmptyString(doc.proposedAt, "proposedAt", errors);

  if (!sourceId || !payloadType || !proposedAt) {
    return { valid: false, errors };
  }

  const source = getMcpSourceEntry(sourceId);
  if (!source) {
    errors.push(`sourceId "${sourceId}" is not registered in sourceRegistry.json`);
    return { valid: false, errors };
  }

  if (!source.allowedPayloadTypes.includes(payloadType)) {
    errors.push(`payloadType "${payloadType}" is not allowed for source "${sourceId}"`);
  }

  if (source.mutationRights !== "none") {
    errors.push(`source "${sourceId}" must have mutationRights "none"`);
  }

  if (!source.approvalRequired) {
    errors.push(`source "${sourceId}" must require operator approval`);
  }

  if (doc.mutationRights !== undefined && doc.mutationRights !== "none") {
    errors.push('MCP payloads may not claim mutationRights other than "none"');
  }

  if (payloadType === "northstar-update") {
    if (doc.proposedBeacon === undefined) {
      errors.push("northstar-update payloads must include proposedBeacon");
    } else {
      validateAgainstCurrentBeacon(doc.proposedBeacon, errors);
    }
    if (doc.signal !== undefined) {
      errors.push("northstar-update payloads must not include signal");
    }
  }

  if (payloadType === "governance-signal") {
    if (doc.signal === undefined) {
      errors.push("governance-signal payloads must include signal");
    } else {
      validateGovernanceSignal(doc.signal, errors);
    }
    if (doc.proposedBeacon !== undefined) {
      errors.push("governance-signal payloads must not include proposedBeacon");
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors, source };
  }

  const payload: McpGovernancePayload = {
    sourceId,
    payloadType,
    proposedAt,
    proposalId: typeof doc.proposalId === "string" ? doc.proposalId : undefined,
    rationale: typeof doc.rationale === "string" ? doc.rationale : undefined,
    proposedBeacon: doc.proposedBeacon,
    signal:
      doc.signal && typeof doc.signal === "object" && !Array.isArray(doc.signal)
        ? (doc.signal as McpGovernancePayload["signal"])
        : undefined,
    metadata:
      doc.metadata && typeof doc.metadata === "object" && !Array.isArray(doc.metadata)
        ? (doc.metadata as Record<string, unknown>)
        : undefined,
  };

  return { valid: true, errors: [], source, payload };
}

export function assertValidMcpPayload(raw: unknown): McpGovernancePayload {
  const result = validateMcpPayload(raw);
  if (!result.valid || !result.payload) {
    throw new McpValidationError(result.errors.join("; "), result.errors);
  }
  return result.payload;
}
