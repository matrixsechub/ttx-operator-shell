export const BEACON_AXIS_ORDER = [
  "STABILITY",
  "REVENUE_VALIDATION",
  "TRUST",
  "CONTROLLED_GROWTH",
  "WILDCARD_INNOVATION",
] as const;

export type BeaconAxis = (typeof BEACON_AXIS_ORDER)[number];
export type BeaconState = "ACTIVE";

export interface BeaconAuthority {
  operator: string;
  aiCouncil: string;
  agents: string;
}

export interface Beacon {
  id: string;
  state: BeaconState;
  axis: BeaconAxis[];
  priorities: string[];
  authority: BeaconAuthority;
  mandate: string;
}

export class BeaconValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BeaconValidationError";
  }
}

function assertNonEmptyString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new BeaconValidationError(`${field} must be a non-empty string`);
  }
  return value;
}

function isBeaconAxis(value: string): value is BeaconAxis {
  return (BEACON_AXIS_ORDER as readonly string[]).includes(value);
}

export function validateBeaconDocument(raw: unknown): Beacon {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new BeaconValidationError("Beacon document must be an object");
  }

  const doc = raw as Record<string, unknown>;

  const id = assertNonEmptyString(doc.id, "id");
  if (id !== "BEACON::NORTHSTAR") {
    throw new BeaconValidationError('id must be "BEACON::NORTHSTAR"');
  }

  const state = assertNonEmptyString(doc.state, "state");
  if (state !== "ACTIVE") {
    throw new BeaconValidationError('state must be "ACTIVE"');
  }

  if (!Array.isArray(doc.axis)) {
    throw new BeaconValidationError("axis must be an array");
  }
  if (doc.axis.length !== BEACON_AXIS_ORDER.length) {
    throw new BeaconValidationError(`axis must contain exactly ${BEACON_AXIS_ORDER.length} entries`);
  }
  const axis: BeaconAxis[] = doc.axis.map((entry, index) => {
    const value = assertNonEmptyString(entry, `axis[${index}]`);
    if (!isBeaconAxis(value)) {
      throw new BeaconValidationError(`axis[${index}] is not a valid beacon axis`);
    }
    if (value !== BEACON_AXIS_ORDER[index]) {
      throw new BeaconValidationError(
        `axis[${index}] must be "${BEACON_AXIS_ORDER[index]}" (got "${value}")`,
      );
    }
    return value;
  });

  if (!Array.isArray(doc.priorities)) {
    throw new BeaconValidationError("priorities must be an array");
  }
  if (doc.priorities.length !== 6) {
    throw new BeaconValidationError("priorities must contain exactly 6 entries");
  }
  const priorities = doc.priorities.map((entry, index) =>
    assertNonEmptyString(entry, `priorities[${index}]`),
  );

  if (!doc.authority || typeof doc.authority !== "object" || Array.isArray(doc.authority)) {
    throw new BeaconValidationError("authority must be an object");
  }
  const authorityRaw = doc.authority as Record<string, unknown>;
  const authority: BeaconAuthority = {
    operator: assertNonEmptyString(authorityRaw.operator, "authority.operator"),
    aiCouncil: assertNonEmptyString(authorityRaw.aiCouncil, "authority.aiCouncil"),
    agents: assertNonEmptyString(authorityRaw.agents, "authority.agents"),
  };

  const mandate = assertNonEmptyString(doc.mandate, "mandate");

  return { id, state: "ACTIVE", axis, priorities, authority, mandate };
}
