import type { BeaconAxis } from "../beacon/beaconSchema";
import { buildNorthstarAlignment } from "../beacon/loadBeacon";
import { getAgentGovernanceContextFor } from "./initAgentGovernance";

export interface NorthstarAlignmentMetadata {
  beacon_id: string;
  axis: BeaconAxis;
  integrity_hash: string;
  safe_mode: boolean;
  strategic_axis: BeaconAxis[];
  governance_context: {
    beacon_id: string;
    strategic_axis: BeaconAxis[];
    mandate: string;
  };
}

export function buildAgentNorthstarAlignment(
  agentId: string,
  axis: BeaconAxis = "STABILITY",
): NorthstarAlignmentMetadata {
  const ctx = getAgentGovernanceContextFor(agentId);
  const alignment = buildNorthstarAlignment(
    {
      beacon: ctx.beacon,
      integrityHash: ctx.integrityHash,
      safeMode: ctx.safeMode,
      warning: ctx.warning,
    },
    axis,
  );
  return {
    ...alignment,
    strategic_axis: [...ctx.beacon.axis],
    governance_context: {
      beacon_id: ctx.beacon.id,
      strategic_axis: [...ctx.beacon.axis],
      mandate: ctx.beacon.mandate,
    },
  };
}
