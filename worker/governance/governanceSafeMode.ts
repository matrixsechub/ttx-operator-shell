import type { ProposalStoreEnv } from "./proposalStore";

const SAFE_MODE_KEY = "governance:safe-mode:state";

export interface GovernanceSafeModeState {
  active: boolean;
  reason: string;
  activatedBy: string;
  activatedAt: string | null;
}

const DEFAULT_STATE: GovernanceSafeModeState = {
  active: false,
  reason: "",
  activatedBy: "",
  activatedAt: null,
};

export async function getGovernanceSafeModeState(env: ProposalStoreEnv): Promise<GovernanceSafeModeState> {
  const raw = await env.TTX_STATE.get(SAFE_MODE_KEY);
  if (!raw) return { ...DEFAULT_STATE };
  try {
    return JSON.parse(raw) as GovernanceSafeModeState;
  } catch {
    return { ...DEFAULT_STATE };
  }
}

export async function setGovernanceSafeModeState(
  env: ProposalStoreEnv,
  state: GovernanceSafeModeState,
): Promise<void> {
  await env.TTX_STATE.put(SAFE_MODE_KEY, JSON.stringify(state));
}

export function isContainmentAction(actionType: string): boolean {
  return actionType === "governance.safe_mode.enter" || actionType === "governance.safe_mode.exit";
}
