import type { GovernanceDeltaClassification, GovernanceDeltaReport, McpGovernanceFragment } from "./types";
import type { BeaconV2 } from "../../../msh-ops/beacon/beaconV2Schema";

export function normalizeMcpFragment(raw: Record<string, unknown>): McpGovernanceFragment | null {
  const sourceId = typeof raw.source_id === "string" ? raw.source_id : "";
  const sourceType = typeof raw.source_type === "string" ? raw.source_type : "";
  const fetchedAt = typeof raw.fetched_at === "string" ? raw.fetched_at : "";
  const verified = raw.verified === true;
  const rules = Array.isArray(raw.rules) ? raw.rules : [];
  if (!sourceId || !sourceType || !fetchedAt) return null;
  return {
    sourceId,
    sourceType,
    fetchedAt,
    verified,
    rules: rules
      .filter((rule): rule is Record<string, unknown> => Boolean(rule) && typeof rule === "object")
      .map((rule) => ({
        id: String(rule.id ?? crypto.randomUUID()),
        axis: String(rule.axis ?? "STABILITY"),
        statement: String(rule.statement ?? ""),
        strength: String(rule.strength ?? "medium"),
        northstarRank: Number(rule.northstar_rank ?? 0),
      })),
  };
}

export function compareFragmentWithBeacon(
  fragment: McpGovernanceFragment,
  beacon: BeaconV2,
): GovernanceDeltaReport {
  const changes: GovernanceDeltaReport["changes"] = [];
  const now = Date.now();
  const fetchedAtMs = Date.parse(fragment.fetchedAt);
  const stale = Number.isFinite(fetchedAtMs) && now - fetchedAtMs > 1000 * 60 * 60 * 24 * 7;

  if (!fragment.verified) {
    return {
      reportId: crypto.randomUUID(),
      sourceId: fragment.sourceId,
      generatedAt: new Date().toISOString(),
      classification: "unverifiable",
      stale,
      changes: [],
      recommendation: "Reject unverified upstream fragment",
      quarantined: true,
    };
  }

  for (const rule of fragment.rules) {
    const axisIndex = beacon.axis.indexOf(rule.axis as (typeof beacon.axis)[number]);
    const localStatement = axisIndex >= 0 ? beacon.priorities[axisIndex] ?? null : null;
    let classification: GovernanceDeltaClassification = "stronger";
    if (axisIndex < 0) {
      classification = "conflicting";
    } else if (rule.northstarRank > 0 && rule.northstarRank < axisIndex) {
      classification = "northstar_conflict";
    } else if (rule.strength === "low") {
      classification = "weaker";
    } else if (localStatement && rule.statement !== localStatement) {
      classification = "conflicting";
    }
    changes.push({
      ruleId: rule.id,
      axis: rule.axis,
      classification,
      localValue: localStatement,
      upstreamValue: rule.statement,
    });
  }

  const hasNorthstarConflict = changes.some((change) => change.classification === "northstar_conflict");
  const hasConflict = changes.some((change) => change.classification === "conflicting");
  const hasWeaker = changes.some((change) => change.classification === "weaker");
  const classification: GovernanceDeltaClassification = hasNorthstarConflict
    ? "northstar_conflict"
    : hasConflict
      ? "conflicting"
      : hasWeaker
        ? "weaker"
        : stale
          ? "stale"
          : "stronger";

  return {
    reportId: crypto.randomUUID(),
    sourceId: fragment.sourceId,
    generatedAt: new Date().toISOString(),
    classification,
    stale,
    changes,
    recommendation:
      classification === "weaker"
        ? "Local Beacon wins — upstream rule weaker"
        : classification === "stronger"
          ? "Upstream stronger safety rule — recommendation only"
          : classification === "northstar_conflict"
            ? "Quarantine — northstar conflict"
            : classification === "stale"
              ? "Warning — stale upstream source"
              : "Review conflicting upstream rules",
    quarantined: classification === "northstar_conflict" || classification === "conflicting",
  };
}
