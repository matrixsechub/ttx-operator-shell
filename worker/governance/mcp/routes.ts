import { jsonResponse } from "../../http";
import { getBeaconV2Draft } from "../../../msh-ops/beacon/beaconV2Schema";
import { compareFragmentWithBeacon, normalizeMcpFragment } from "./compare";
import { listGovernanceDeltaReports, saveGovernanceDeltaReport } from "./deltaStore";
import type { ProposalStoreEnv } from "../proposalStore";
import { buildTelemetryEvent, emitGovernanceTelemetry } from "../governanceTelemetry";
import { getCodexManifestSnapshot } from "../../codex/manifestHash";
import { getActiveBeaconHash } from "../beaconContext";

export type McpGovernanceRouteEnv = ProposalStoreEnv & {
  AUTH_SIGNING_KEY?: string;
  BEACON_SIGNING_KEY?: string;
  DEPLOY_ENV?: string;
};
async function readJsonBody(request: Request): Promise<Record<string, unknown>> {
  const parsed = (await request.json()) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("JSON body must be an object");
  }
  return parsed as Record<string, unknown>;
}

export async function handleMcpGovernanceRoute(
  request: Request,
  pathname: string,
  method: string,
  env: McpGovernanceRouteEnv,
): Promise<Response | null> {
  if (pathname === "/api/governance/mcp/deltas" && method === "GET") {
    const reports = await listGovernanceDeltaReports(env);
    return jsonResponse({ ok: true, reports });
  }

  if (pathname === "/api/governance/mcp/delta" && method === "POST") {
    try {
      const body = await readJsonBody(request);
      const fragment = normalizeMcpFragment(body);
      if (!fragment) {
        return jsonResponse({ ok: false, error: "Invalid MCP governance fragment metadata" }, 400);
      }
      const beacon = getBeaconV2Draft();
      const report = compareFragmentWithBeacon(fragment, beacon);
      await saveGovernanceDeltaReport(env, report);
      const codex = await getCodexManifestSnapshot();
      const beaconState = await getActiveBeaconHash(env);
      const eventName = report.quarantined
        ? "governance.mcp_delta.quarantined"
        : "governance.mcp_delta.generated";
      await emitGovernanceTelemetry(
        env,
        buildTelemetryEvent(eventName, {
          beaconHash: beaconState.hash,
          codexHash: codex.manifestHash,
          environment: env.DEPLOY_ENV ?? "development",
          actionClass: "C1",
          outcome: report.classification,
          reasonCode: report.classification,
          correlationId: report.reportId,
        }),
      );
      return jsonResponse({ ok: true, report }, 201);
    } catch (error) {
      const message = error instanceof Error ? error.message : "mcp-delta-failed";
      return jsonResponse({ ok: false, error: message }, 400);
    }
  }

  return null;
}
