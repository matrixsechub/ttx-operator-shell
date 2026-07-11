import type { ProposalStoreEnv } from "../proposalStore";
import type { GovernanceDeltaReport } from "./types";

const DELTA_PREFIX = "governance:v2:mcp-delta:";
const DELTA_INDEX_KEY = "governance:v2:mcp-delta:index";

export async function saveGovernanceDeltaReport(
  env: ProposalStoreEnv,
  report: GovernanceDeltaReport,
): Promise<void> {
  await env.TTX_STATE.put(`${DELTA_PREFIX}${report.reportId}`, JSON.stringify(report), {
    expirationTtl: 60 * 60 * 24 * 30,
  });
  const raw = await env.TTX_STATE.get(DELTA_INDEX_KEY);
  const index = raw ? (JSON.parse(raw) as string[]) : [];
  index.unshift(report.reportId);
  await env.TTX_STATE.put(DELTA_INDEX_KEY, JSON.stringify(index.slice(0, 200)));
}

export async function listGovernanceDeltaReports(env: ProposalStoreEnv): Promise<GovernanceDeltaReport[]> {
  const raw = await env.TTX_STATE.get(DELTA_INDEX_KEY);
  if (!raw) return [];
  const ids = JSON.parse(raw) as string[];
  const reports: GovernanceDeltaReport[] = [];
  for (const id of ids) {
    const entry = await env.TTX_STATE.get(`${DELTA_PREFIX}${id}`);
    if (!entry) continue;
    try {
      reports.push(JSON.parse(entry) as GovernanceDeltaReport);
    } catch {
      continue;
    }
  }
  return reports;
}
