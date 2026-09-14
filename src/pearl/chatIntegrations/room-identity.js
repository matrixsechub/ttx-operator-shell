/**
 * PEARL Chat room identity — colour is identity only, never disposition.
 * Canonical set from Chat Room UX contract (#151), tokens from #150 tip.
 */

export const ROOM_IDENTITY = Object.freeze({
  operator: {
    id: "operator",
    name: "Operator",
    colour: "pearl",
    token: "var(--pearl)",
    hex: "#F6F7F9",
    inkHex: "#171A20",
  },
  council: {
    id: "council",
    name: "Council",
    colour: "champagne",
    token: "var(--gold)",
    hex: "#C9A961",
    inkHex: "#6E5626",
  },
  factory: {
    id: "factory",
    name: "Factory",
    colour: "cyan",
    token: "var(--spec-cyan)",
    hex: "#19C6E6",
    inkHex: "#0B6E8A",
  },
  security: {
    id: "security",
    name: "Security",
    colour: "electric",
    token: "var(--spec-blue)",
    hex: "#3D7BFF",
    inkHex: "#2856CF",
  },
  "marketplace-ops": {
    id: "marketplace-ops",
    name: "Marketplace Ops",
    colour: "magenta",
    token: "var(--spec-magenta)",
    hex: "#D64FD6",
    inkHex: "#AD2C87",
  },
  "school-pilot": {
    id: "school-pilot",
    name: "School Pilot",
    colour: "violet",
    token: "var(--spec-violet)",
    hex: "#7C5CFF",
    inkHex: "#6746C4",
  },
  architecture: {
    id: "architecture",
    name: "Architecture",
    colour: "indigo",
    token: "var(--spec-blue)",
    hex: "#3D7BFF",
    inkHex: "#2A3F9E",
  },
  audit: {
    id: "audit",
    name: "Audit",
    colour: "rose",
    token: "var(--spec-pink)",
    hex: "#F06FA8",
    inkHex: "#B3261E",
  },
});

export const ROOM_IDS = Object.freeze(Object.keys(ROOM_IDENTITY));

export const DISPOSITIONS = Object.freeze(["PASS", "HOLD", "BLOCKED"]);

/** Unknown rooms fail closed to graphite — never emerald / gold / amber / red as identity. */
export const UNKNOWN_ROOM_IDENTITY = Object.freeze({
  id: "unknown",
  name: "Unknown",
  colour: "graphite",
  token: "var(--ink-dim)",
  hex: "#666E7A",
  inkHex: "#666E7A",
});

export function resolveRoomIdentity(roomId) {
  if (!roomId || typeof roomId !== "string") return { ...UNKNOWN_ROOM_IDENTITY };
  if (roomId.startsWith("dm:")) {
    return {
      id: roomId,
      name: `Direct · ${roomId.slice(3)}`,
      colour: "graphite",
      token: "var(--graphite)",
      hex: "#262B34",
      inkHex: "#262B34",
      isolated: true,
    };
  }
  return ROOM_IDENTITY[roomId] ? { ...ROOM_IDENTITY[roomId] } : { ...UNKNOWN_ROOM_IDENTITY };
}

/**
 * Identity must never be derived from Beacon disposition.
 * Disposition must never be derived from room colour.
 */
export function assertIdentityDispositionSeparation(roomId, disposition) {
  const identity = resolveRoomIdentity(roomId);
  if (disposition && !DISPOSITIONS.includes(disposition)) {
    return { ok: false, reason: "unknown_disposition_fail_closed", disposition: "BLOCKED" };
  }
  return {
    ok: true,
    identityColour: identity.colour,
    disposition: disposition || null,
    note: "Room colour is identity only; Beacon disposition is independent.",
  };
}
