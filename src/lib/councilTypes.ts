import type { PrismCouncilEnvelope } from "./uiuxTypes";

export type PrismCouncilAdvisoryItem = {
  auditId: string;
  mode: string;
  routes: string[];
  viewport: string;
  overallScore: number;
  releaseRecommendation: string;
  criticalCount: number;
  findingCount: number;
  createdAt: string;
  evidenceHash: string;
  advisoryRank: number;
  briefingSummary: string;
  councilEnvelope: PrismCouncilEnvelope;
  advisoryOnly: true;
  mutationAuthorized: false;
};

export type PrismCouncilAdvisoryBundle = {
  assembledAt: string;
  source: "prism_ttx_state";
  advisoryOnly: true;
  mutationAuthorized: false;
  rankedAuditIds: string[];
  items: PrismCouncilAdvisoryItem[];
  evidenceHash: string;
};

export type CouncilPacket = {
  assembledAt: string;
  advisoryOnly: true;
  mutationAuthorized: false;
  prismAdvisories: PrismCouncilAdvisoryBundle;
  prismTriageSummary?: {
    total: number;
    critical: number;
    high: number;
    proposalReady: number;
    operatorDecisionRequired: number;
  };
};

export type CouncilPacketResponse = {
  ok: true;
  packet: CouncilPacket;
};

export type PrismAdvisoriesResponse = {
  ok: true;
  advisories: PrismCouncilAdvisoryBundle;
};
