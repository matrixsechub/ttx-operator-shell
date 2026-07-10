/**
 * WILDCARD: Cycle 2 — structured discovery scan for operator advancement proposals.
 * FEDGRADE: Compliance preserved — read-only proposals; no auto-apply mutations.
 */

import { buildAgentNorthstarAlignment } from "../msh-ops/agent/beaconAlignment";
import { deploymentHeaders } from "./edge/headers";

const WILDCARD_ADVANCEMENT_AGENT_ID = "WildcardAdvancementAgent";

export type WildcardProposalStatus = "proposed" | "acknowledged" | "deferred" | "applied";
export type WildcardProposalDomain = "security" | "architecture" | "ux" | "performance" | "dx";
export type WildcardProposalSeverity = "info" | "low" | "medium" | "high";

export interface WildcardProposal {
  id: string;
  status: WildcardProposalStatus;
  created_at: string;
  agent: "WildcardAdvancementAgent";
  domain: WildcardProposalDomain;
  severity: WildcardProposalSeverity;
  title: string;
  recommendation: string;
  fedgrade_comment?: string;
  wildcard_comment?: string;
}

export interface WildcardScanLifecycle {
  schema: "wildcard_scan_v2";
  scan_id: string;
  agent: "WildcardAdvancementAgent";
  mode: "discovery-only";
  scanned_at: string;
  northstar_alignment: ReturnType<typeof buildAgentNorthstarAlignment>;
  summary: {
    proposal_count: number;
    by_domain: Record<string, number>;
    by_severity: Record<string, number>;
  };
  proposals: WildcardProposal[];
}

const REQUIRED_HEADERS = [
  "Content-Security-Policy-Report-Only",
  "Strict-Transport-Security",
  "Permissions-Policy",
] as const;

function buildProposal(
  partial: Omit<WildcardProposal, "id" | "status" | "created_at" | "agent">,
): WildcardProposal {
  return {
    id: crypto.randomUUID(),
    status: "proposed",
    created_at: new Date().toISOString(),
    agent: "WildcardAdvancementAgent",
    ...partial,
  };
}

export function runWildcardDiscoveryScan(options: { includeSiteMap?: boolean } = {}): WildcardScanLifecycle {
  const proposals: WildcardProposal[] = [];
  const headers = deploymentHeaders();

  for (const headerName of REQUIRED_HEADERS) {
    if (!headers[headerName]) {
      proposals.push(
        buildProposal({
          domain: "security",
          severity: "medium",
          title: `Missing ${headerName}`,
          recommendation: `Add ${headerName} via worker/edge/headers deploymentHeaders().`,
          fedgrade_comment: `// FEDGRADE: SECURITY ISSUE - missing ${headerName} header.`,
          wildcard_comment: "// WILDCARD: Improvement applied — extend deployment security headers",
        }),
      );
    }
  }

  proposals.push(
    buildProposal({
      domain: "architecture",
      severity: "info",
      title: "Operator API route registry",
      recommendation: "Verify worker/edge/routeClass.ts OPERATOR_PROTECTED matches deployed operator surfaces.",
      wildcard_comment: "// WILDCARD: route registry drift check recommended each release",
    }),
  );

  if (options.includeSiteMap !== false) {
    proposals.push(
      buildProposal({
        domain: "ux",
        severity: "info",
        title: "Public surface registry",
        recommendation: "Confirm engine-extensions overlay and MSHOPS-Storefront backports stay in sync.",
        fedgrade_comment: "// FEDGRADE: UX CLARITY - site map drives operator guidance surfaces",
      }),
    );
  }

  const byDomain: Record<string, number> = {};
  const bySeverity: Record<string, number> = {};
  for (const proposal of proposals) {
    byDomain[proposal.domain] = (byDomain[proposal.domain] ?? 0) + 1;
    bySeverity[proposal.severity] = (bySeverity[proposal.severity] ?? 0) + 1;
  }

  return {
    schema: "wildcard_scan_v2",
    scan_id: crypto.randomUUID(),
    agent: "WildcardAdvancementAgent",
    mode: "discovery-only",
    scanned_at: new Date().toISOString(),
    northstar_alignment: buildAgentNorthstarAlignment(WILDCARD_ADVANCEMENT_AGENT_ID, "WILDCARD_INNOVATION"),
    summary: {
      proposal_count: proposals.length,
      by_domain: byDomain,
      by_severity: bySeverity,
    },
    proposals,
  };
}

export function getWildcardHealthResponse() {
  return {
    ok: true,
    agent: "WildcardAdvancementAgent",
    mode: "discovery-only",
    lifecycle_schema: "wildcard_scan_v2",
    endpoints: {
      health: "GET /api/wildcard",
      scan: "POST /api/wildcard/scan",
    },
  };
}

export async function handleWildcardRoute(request: Request, pathname: string): Promise<Response | null> {
  if (pathname === "/api/wildcard" && request.method === "GET") {
    return Response.json(getWildcardHealthResponse(), {
      status: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  }

  if (pathname === "/api/wildcard/scan" && request.method === "POST") {
    let payload: { include_site_map?: boolean } = {};
    try {
      payload = (await request.json()) as { include_site_map?: boolean };
    } catch {
      payload = {};
    }

    const lifecycle = runWildcardDiscoveryScan({
      includeSiteMap: payload.include_site_map !== false,
    });

    return Response.json(lifecycle, {
      status: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  }

  return null;
}
