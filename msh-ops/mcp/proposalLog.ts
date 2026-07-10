import type { BeaconUpdateProposal } from "./proposalTypes";

const proposalLog: BeaconUpdateProposal[] = [];

export function appendMcpProposalLog(proposal: BeaconUpdateProposal): Readonly<BeaconUpdateProposal> {
  const frozen = Object.freeze({ ...proposal });
  const index = proposalLog.findIndex((entry) => entry.proposalId === proposal.proposalId);
  if (index >= 0) {
    proposalLog[index] = frozen;
  } else {
    proposalLog.unshift(frozen);
  }
  return frozen;
}

export function listMcpProposalLog(): ReadonlyArray<BeaconUpdateProposal> {
  return Object.freeze([...proposalLog]);
}

export function getMcpProposalById(proposalId: string): BeaconUpdateProposal | undefined {
  return proposalLog.find((entry) => entry.proposalId === proposalId);
}

export function clearMcpProposalLogForTests(): void {
  proposalLog.length = 0;
}
