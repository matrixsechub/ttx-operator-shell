export type ActionClass = "C0" | "C1" | "C2" | "C3" | "C4" | "C5" | "C6";

export interface ProposalQueueRow {
  id: string;
  target: string;
  actionClass: ActionClass;
  risk: string;
  summary: string;
  createdBy: string;
  createdAt: string;
  status: string;
}

export interface RawProposalRow {
  proposal_id: string;
  target_system: string;
  action_class: ActionClass;
  risk_score: { qualitative: string };
  summary: string;
  created_by: string;
  created_at: string;
  status: string;
}

export function truncateHash(hash: string): string {
  if (!hash || hash.length <= 16) return hash || "—";
  return `${hash.slice(0, 8)}…${hash.slice(-8)}`;
}

export function requiresConfirmation(actionClass: ActionClass): boolean {
  const rank = Number(actionClass.slice(1));
  return rank >= 4;
}

export function filterProposalQueue(
  rows: RawProposalRow[],
  statusFilter: string,
  classFilter: string,
): ProposalQueueRow[] {
  return rows
    .map((row) => ({
      id: row.proposal_id,
      target: row.target_system,
      actionClass: row.action_class,
      risk: row.risk_score.qualitative,
      summary: row.summary,
      createdBy: row.created_by,
      createdAt: row.created_at,
      status: row.status,
    }))
    .filter((row) => (statusFilter === "all" ? true : row.status === statusFilter))
    .filter((row) => (classFilter === "all" ? true : row.actionClass === classFilter));
}

export function buildApprovePayload(input: {
  rationale?: string;
  constraints: string[];
  actionType: string;
  mutationPayload: Record<string, unknown>;
}): Record<string, unknown> {
  return {
    rationale: input.rationale?.trim() || undefined,
    constraints: input.constraints,
    actionType: input.actionType,
    mutationPayload: input.mutationPayload,
  };
}

export function buildDenyPayload(rationale: string): Record<string, unknown> {
  return { rationale: rationale.trim() || "denied" };
}

export function buildRevisionPayload(rationale: string): Record<string, unknown> {
  return { rationale: rationale.trim() || "revision requested" };
}

const SECRET_PATTERNS = [
  /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/,
  /Bearer\s+[A-Za-z0-9._-]+/i,
  /AUTH_SIGNING_KEY/i,
  /GOVERNANCE_RECEIPT_SIGNING_KEY/i,
  /BEACON_SIGNING_KEY/i,
];

export function containsSecretShape(value: string): boolean {
  return SECRET_PATTERNS.some((pattern) => pattern.test(value));
}

export function formatAuditTimeline(events: Array<Record<string, unknown>>): string[] {
  return events.slice(0, 12).map((event) => {
    const timestamp = String(event.timestamp ?? "");
    const eventType = String(event.event_type ?? "");
    const result = String(event.result ?? "");
    return `${timestamp} · ${eventType} · ${result}`;
  });
}

export function councilAdvisoryLabel(advisoryOnly: boolean): string {
  return advisoryOnly ? "Council review (advisory only)" : "Council review";
}
