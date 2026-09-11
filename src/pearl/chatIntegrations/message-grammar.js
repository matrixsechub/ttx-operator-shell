/**
 * Chat message grammar helpers — messages request authority, never create it.
 */

export const ROW_KINDS = Object.freeze([
  "human",
  "agent",
  "system",
  "beacon",
  "tool",
  "exec",
  "receipt",
  "council",
  "denied",
]);

const INTENT_VERBS =
  /\b(i will|i'll|deploy|execute|mutate|write|delete|send|invoke|call the api|run the)\b/i;

/**
 * Mark agent statements of intent. Never gold / never a state hue.
 */
export function detectIntentMarker(message) {
  if (!message || message.kind !== "agent") return null;
  if (message.intentMarked === true || message.requestsAuthority === true) {
    return {
      marker: "INTENT · NOT AUTHORIZED",
      style: "neutral-dashed",
      grantsAuthority: false,
    };
  }
  if (typeof message.text === "string" && INTENT_VERBS.test(message.text)) {
    return {
      marker: "INTENT · NOT AUTHORIZED",
      style: "neutral-dashed",
      grantsAuthority: false,
      inferred: true,
    };
  }
  return null;
}

/**
 * Authority is never a message property. Derived view only.
 */
export function authorityFromMessage(message) {
  void message;
  return {
    authorized: false,
    grantsAuthority: false,
    reason: "Messages cannot create authority",
  };
}

/**
 * Decision row availability for a tool request card.
 */
export function decisionRowForRequest(request, wristbandCanSimulate) {
  if (!request) return { show: false, reason: "missing_request" };
  if (request.beacon === "BLOCKED" || request.status === "blocked") {
    return { show: false, reason: "blocked", outcome: "Denied" };
  }
  if (!request.approval) {
    return { show: false, reason: "no_approval_required" };
  }
  if (!wristbandCanSimulate) {
    return { show: false, reason: "decision_unavailable", label: "Decision unavailable" };
  }
  if (request.status !== "pending") {
    return { show: false, reason: "not_pending" };
  }
  return {
    show: true,
    actions: ["APPROVE", "DENY", "INSPECT"],
    simulationOnly: true,
    grantsAuthority: false,
    caption: "Operator decision · simulation-only",
  };
}

/**
 * Post-decision simulated outcome (fixture behaviour).
 */
export function requestOutcomeAfterDecision(request, decision, gateEnabled) {
  if (decision === "deny") {
    return {
      status: "denied",
      beaconRow: "BLOCKED",
      exec: false,
      receipt: "denial",
      charged: false,
    };
  }
  if (decision === "inspect") {
    return { status: "pending", inspect: true, exec: false };
  }
  if (decision !== "approve") {
    return { status: request.status, exec: false };
  }
  const consequentialHold = request.cls === "consequential" && gateEnabled !== true;
  return {
    status: "approved",
    beaconRow: consequentialHold ? "HOLD" : "PASS",
    exec: true,
    simulatedOnly: true,
    factoryGateNote: consequentialHold ? "factory gate OFF · simulated" : null,
    receipt: "execution",
    charged: true,
  };
}

export function normalizeRow(row) {
  const kind = ROW_KINDS.includes(row?.kind) ? row.kind : "denied";
  if (kind === "denied" && row?.kind && !ROW_KINDS.includes(row.kind)) {
    return {
      kind: "denied",
      text: "Unknown row · fail-closed",
      grantsAuthority: false,
    };
  }
  const out = { ...row, kind, grantsAuthority: false };
  if (Object.prototype.hasOwnProperty.call(out, "authorized")) {
    delete out.authorized;
  }
  return out;
}
