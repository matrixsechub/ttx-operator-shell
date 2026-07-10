import type { BeaconLoadResult } from "../beacon/loadBeacon";
import { ensureBeaconLoaded, loadBeacon } from "../beacon/loadBeacon";
import type { Beacon } from "../beacon/beaconSchema";

export interface AgentGovernanceContext {
  agentId: string;
  beacon: Readonly<Beacon>;
  integrityHash: string;
  safeMode: boolean;
  warning?: string;
}

let defaultContext: AgentGovernanceContext | null = null;
const defaultInit = ensureBeaconLoaded().then((result) => {
  defaultContext = toAgentContext("system", result);
  return defaultContext;
});

function toAgentContext(agentId: string, result: BeaconLoadResult): AgentGovernanceContext {
  if (result.safeMode) {
    console.warn(`[${agentId}] NORTHSTAR_BEACON_SAFE_MODE: ${result.warning ?? "unknown"}`);
  }
  return {
    agentId,
    beacon: result.beacon,
    integrityHash: result.integrityHash,
    safeMode: result.safeMode,
    warning: result.warning,
  };
}

export async function ensureAgentGovernance(): Promise<AgentGovernanceContext> {
  return defaultInit;
}

export function initAgentGovernance(agentId: string): AgentGovernanceContext {
  const result = loadBeacon();
  return toAgentContext(agentId, result);
}

export function getAgentGovernanceContext(): AgentGovernanceContext {
  if (defaultContext) {
    return defaultContext;
  }
  const result = loadBeacon();
  defaultContext = toAgentContext("system", result);
  return defaultContext;
}

export function getAgentGovernanceContextFor(agentId: string): AgentGovernanceContext {
  const base = getAgentGovernanceContext();
  return { ...base, agentId };
}
