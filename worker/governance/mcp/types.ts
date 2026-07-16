export type GovernanceDeltaClassification =
  | "weaker"
  | "stronger"
  | "conflicting"
  | "stale"
  | "unverifiable"
  | "northstar_conflict";

export interface McpGovernanceRule {
  id: string;
  axis: string;
  statement: string;
  strength: string;
  northstarRank: number;
}

export interface McpGovernanceFragment {
  sourceId: string;
  sourceType: string;
  fetchedAt: string;
  verified: boolean;
  rules: McpGovernanceRule[];
}

export interface GovernanceDeltaChange {
  ruleId: string;
  axis: string;
  classification: GovernanceDeltaClassification;
  localValue: string | null;
  upstreamValue: string;
}

export interface GovernanceDeltaReport {
  reportId: string;
  sourceId: string;
  generatedAt: string;
  classification: GovernanceDeltaClassification;
  stale: boolean;
  changes: GovernanceDeltaChange[];
  recommendation: string;
  quarantined: boolean;
}
