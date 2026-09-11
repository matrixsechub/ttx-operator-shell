/**
 * Wristband presentation for PEARL Chat — visibility/context only.
 * grantsAuthority is always false; wristband never creates authority.
 */

import { resolveRoomIdentity, DISPOSITIONS } from "./room-identity.js";

export const BAND_STATES = Object.freeze([
  "FULL",
  "NARROW",
  "CROSS-ROOM",
  "LOCKED",
  "DENIED",
  "UNKNOWN",
]);

export const WRISTBAND_CAPABILITIES = Object.freeze([
  "view_messages",
  "view_receipts",
  "view_beacon",
  "view_evidence_drawer",
  "simulate_pending",
]);

export function createChatWristband(opts = {}) {
  const roomIds = Array.isArray(opts.roomIds) ? [...opts.roomIds] : [];
  const capabilities = Array.isArray(opts.capabilities)
    ? opts.capabilities.filter((c) => WRISTBAND_CAPABILITIES.includes(c))
    : [...WRISTBAND_CAPABILITIES];
  return Object.freeze({
    bandId: opts.bandId || "wrist_operator_preview",
    label: opts.label || "Operator preview wristband",
    mode: opts.mode === "narrow" ? "narrow" : "full",
    roomIds,
    capabilities,
    grantsAuthority: false,
    mutatesAuth: false,
    mutatesGovernance: false,
  });
}

export function operatorFullWristband(roomIds) {
  return createChatWristband({
    bandId: "wrist_operator_preview",
    label: "Operator · full preview rooms",
    mode: "full",
    roomIds: roomIds || [
      "operator",
      "council",
      "factory",
      "security",
      "marketplace-ops",
      "school-pilot",
      "architecture",
      "audit",
    ],
  });
}

export function architectAuditorNarrowWristband() {
  return createChatWristband({
    bandId: "wrist_architect_auditor",
    label: "Spec+Governance only",
    mode: "narrow",
    roomIds: ["operator", "council", "architecture", "audit"],
    capabilities: [
      "view_messages",
      "view_receipts",
      "view_beacon",
      "view_evidence_drawer",
    ],
  });
}

/**
 * Derive presentation band state for a room.
 * UNKNOWN room ids fail closed. Wristband never alters Beacon disposition.
 */
export function bandState(roomId, wristband, roomBeacon) {
  const identity = resolveRoomIdentity(roomId);
  if (identity.id === "unknown" || identity.colour === "graphite" && !roomId?.startsWith("dm:")) {
    if (!roomId || identity.name === "Unknown") {
      return {
        state: "UNKNOWN",
        strip: "graphite",
        label: "unknown",
        text: "BLOCKED · fail-closed",
        grantsAuthority: false,
        identity,
      };
    }
  }

  const inBand =
    wristband &&
    Array.isArray(wristband.roomIds) &&
    wristband.roomIds.includes(roomId);

  if (roomBeacon === "BLOCKED") {
    return {
      state: "DENIED",
      strip: identity.colour,
      label: identity.name,
      text: "BLOCKED",
      grantsAuthority: false,
      identity,
    };
  }

  if (!inBand) {
    return {
      state: "LOCKED",
      strip: "muted",
      label: identity.name,
      text: "locked",
      grantsAuthority: false,
      identity,
    };
  }

  if (wristband.mode === "narrow") {
    return {
      state: "NARROW",
      strip: identity.colour,
      label: identity.name,
      text: "narrow",
      grantsAuthority: false,
      identity,
    };
  }

  return {
    state: "FULL",
    strip: identity.colour,
    label: identity.name,
    text: "full",
    grantsAuthority: false,
    identity,
  };
}

export function crossRoomBand(sourceRoomId, destRoomId) {
  const source = resolveRoomIdentity(sourceRoomId);
  const dest = resolveRoomIdentity(destRoomId);
  return {
    state: "CROSS-ROOM",
    strip: "gradient",
    label: `${source.name} → ${dest.name}`,
    text: "",
    grantsAuthority: false,
    source,
    dest,
  };
}

export function canSimulatePending(wristband) {
  if (!wristband || wristband.grantsAuthority === true) return false;
  return (
    Array.isArray(wristband.capabilities) &&
    wristband.capabilities.includes("simulate_pending")
  );
}

export function wristbandCannotGrantAuthority(wristband) {
  return (
    wristband &&
    wristband.grantsAuthority === false &&
    wristband.mutatesAuth === false &&
    wristband.mutatesGovernance === false
  );
}

export function dispositionIndependentOfBand(roomBeacon, bandPresentation) {
  if (roomBeacon && !DISPOSITIONS.includes(roomBeacon)) return false;
  // Band state never rewrites Beacon disposition.
  return bandPresentation && typeof bandPresentation.state === "string";
}
