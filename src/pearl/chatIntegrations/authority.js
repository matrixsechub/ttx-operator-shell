/**
 * Integrations authority derivation — health ≠ authority.
 * Connected / Purchased / Installed / Credits available never imply Authorized.
 * Beacon PASS never implies Operator approval.
 */

export const CONNECTION_HEALTH = Object.freeze([
  "Connected",
  "Degraded",
  "Disabled",
  "Blocked",
]);

export const ENABLEMENT = Object.freeze(["Enabled", "Off"]);

export const BEACON = Object.freeze(["PASS", "HOLD", "BLOCKED"]);

/**
 * @param {{ health: string, enabled: boolean, beacon: string, safeMode?: boolean }} input
 */
export function authorityView(input) {
  const health = CONNECTION_HEALTH.includes(input.health)
    ? input.health
    : "Blocked";
  const beacon = BEACON.includes(input.beacon) ? input.beacon : "BLOCKED";
  const enabled = input.enabled === true;
  const safeMode = input.safeMode === true;

  // Fail-closed: unknown axes → Denied / Blocked display
  if (!CONNECTION_HEALTH.includes(input.health) || !BEACON.includes(input.beacon)) {
    return {
      authority: "Denied (BLOCKED)",
      health,
      beacon: "BLOCKED",
      enabled,
      safeMode,
      grantsAuthority: false,
      note: "Fail-closed: unknown health or Beacon → Denied",
    };
  }

  if (!enabled) {
    return {
      authority: "Dormant",
      health,
      beacon,
      enabled: false,
      safeMode,
      grantsAuthority: false,
      note: "Off · operator — core remains operational; Beacon may still report PASS",
    };
  }

  if (beacon === "BLOCKED") {
    return {
      authority: "Denied (BLOCKED)",
      health,
      beacon,
      enabled: true,
      safeMode,
      grantsAuthority: false,
      note: "Beacon BLOCKED withholds authority regardless of connection health",
    };
  }

  if (beacon === "HOLD") {
    return {
      authority: "Withheld (HOLD)",
      health,
      beacon,
      enabled: true,
      safeMode,
      grantsAuthority: false,
      note: "Beacon HOLD withholds authority; Connected ≠ Authorized",
    };
  }

  // beacon PASS + enabled
  return {
    authority: safeMode ? "Authorized · scoped (read only)" : "Authorized · scoped",
    health,
    beacon: "PASS",
    enabled: true,
    safeMode,
    grantsAuthority: false,
    note:
      "Display-only scoped authority view. Beacon PASS ≠ Operator approval. grantsAuthority:false.",
  };
}

/**
 * Capability disposition cannot exceed source disposition; safe mode floors writes.
 */
export function toolDisposition({
  sourceBeacon,
  cls,
  safeMode = false,
  denyListed = false,
}) {
  const beacon = BEACON.includes(sourceBeacon) ? sourceBeacon : "BLOCKED";
  if (denyListed) {
    return {
      disposition: "BLOCKED",
      gate: "Approval required",
      reason: "deny-listed",
    };
  }
  if (beacon === "BLOCKED") {
    return { disposition: "BLOCKED", gate: "n/a", reason: "source_blocked" };
  }
  if (cls === "read") {
    return {
      disposition: beacon,
      gate: "No approval",
      reason: beacon === "HOLD" ? "inherited_hold" : "read_auto",
    };
  }
  // write / external / consequential
  if (safeMode) {
    return {
      disposition: "BLOCKED",
      gate: "Approval required",
      reason: "safe_mode_floor",
    };
  }
  return {
    disposition: beacon,
    gate: "Approval required",
    reason: beacon === "HOLD" ? "policy_hold" : "approval_required",
  };
}

/** Non-equivalence assertions for UI copy / tests. */
export const NON_EQUIVALENCES = Object.freeze([
  "Connected ≠ Authorized",
  "Purchased ≠ Authorized",
  "Installed ≠ Authorized",
  "Credits available ≠ Authorized",
  "Beacon PASS ≠ Operator approval",
  "Message may request authority, never create it",
]);

export function healthNeverImpliesAuthority(health, authorityLabel) {
  if (health === "Connected" && authorityLabel === "Authorized · scoped") {
    // Allowed only when Beacon PASS + Enabled also hold — caller must pass full view.
    return true;
  }
  // Connected alone must not be treated as Authorized without Beacon+enablement.
  return !(health === "Connected" && authorityLabel?.startsWith("Authorized") && arguments.length < 3);
}
