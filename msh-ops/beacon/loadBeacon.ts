import northstarDocument from "./northstar.json" with { type: "json" };
import {
  BeaconValidationError,
  validateBeaconDocument,
  type Beacon,
  type BeaconAxis,
} from "./beaconSchema";
import {
  BeaconIntegrityError,
  EXPECTED_BEACON_SHA256,
  verifyBeaconIntegrity,
} from "./beaconIntegrity";

export { EXPECTED_BEACON_SHA256 } from "./beaconIntegrity";
export type { Beacon, BeaconAxis, BeaconAuthority } from "./beaconSchema";
export { BeaconValidationError, BeaconIntegrityError };

export interface BeaconLoadResult {
  beacon: Readonly<Beacon>;
  integrityHash: string;
  safeMode: boolean;
  warning?: string;
}

export interface LoadBeaconOptions {
  allowSafeMode?: boolean;
  source?: unknown;
  expectedHash?: string;
}

function freezeBeacon(beacon: Beacon): Readonly<Beacon> {
  Object.freeze(beacon.authority);
  Object.freeze(beacon.axis);
  Object.freeze(beacon.priorities);
  return Object.freeze(beacon);
}

function safeModeStub(warning: string): BeaconLoadResult {
  return {
    beacon: freezeBeacon({
      id: "BEACON::NORTHSTAR",
      state: "ACTIVE",
      axis: [],
      priorities: [],
      authority: { operator: "", aiCouncil: "", agents: "" },
      mandate: "",
    }),
    integrityHash: "",
    safeMode: true,
    warning,
  };
}

async function resolveBeaconLoad(
  source: unknown,
  options: LoadBeaconOptions = {},
): Promise<BeaconLoadResult> {
  const expectedHash = options.expectedHash ?? EXPECTED_BEACON_SHA256;
  try {
    const beacon = validateBeaconDocument(source);
    const integrityHash = await verifyBeaconIntegrity(beacon, expectedHash);
    return {
      beacon: freezeBeacon(beacon),
      integrityHash,
      safeMode: false,
    };
  } catch (error) {
    if (!options.allowSafeMode) {
      throw error;
    }
    const warning =
      error instanceof Error ? error.message : "Beacon validation or integrity check failed";
    return safeModeStub(warning);
  }
}

let bundledResult: BeaconLoadResult | null = null;
const bundledInit = resolveBeaconLoad(northstarDocument).then((result) => {
  bundledResult = result;
  return result;
});

export async function ensureBeaconLoaded(): Promise<BeaconLoadResult> {
  return bundledInit;
}

export function loadBeacon(): BeaconLoadResult {
  if (!bundledResult) {
    throw new BeaconIntegrityError(
      "Beacon not initialized — await ensureBeaconLoaded() or assertBeaconOnStartup() first",
    );
  }
  return bundledResult;
}

export async function loadBeaconFromPayload(
  source: unknown,
  options: LoadBeaconOptions = {},
): Promise<BeaconLoadResult> {
  return resolveBeaconLoad(source, options);
}

export async function assertBeaconOnStartup(): Promise<BeaconLoadResult> {
  const result = await ensureBeaconLoaded();
  if (result.safeMode) {
    throw new BeaconIntegrityError(result.warning ?? "Beacon entered safe mode at startup");
  }
  return result;
}

export function buildNorthstarAlignment(
  result: BeaconLoadResult,
  axis: BeaconAxis = "STABILITY",
): {
  beacon_id: string;
  axis: BeaconAxis;
  integrity_hash: string;
  safe_mode: boolean;
} {
  return {
    beacon_id: result.beacon.id,
    axis,
    integrity_hash: result.integrityHash,
    safe_mode: result.safeMode,
  };
}
