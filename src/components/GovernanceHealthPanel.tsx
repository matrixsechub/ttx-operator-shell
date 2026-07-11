import { useApiResource } from "../lib/useApiResource";
import { api } from "../lib/apiClient";

function truncateHash(hash: string): string {
  if (hash.length <= 16) return hash;
  return `${hash.slice(0, 8)}…${hash.slice(-8)}`;
}

export function GovernanceHealthPanel() {
  const { result, loading } = useApiResource(api.getSystemState, { pollIntervalMs: 20_000 });
  const governance = result?.ok ? result.data.state.operatorOs?.governance : null;
  const beacon = result?.ok ? result.data.state.operatorOs?.beacon : null;

  return (
    <div className="op-panel rounded-sm p-4">
      <h2 className="text-xs uppercase tracking-widest text-op-text-dim">Governance Health</h2>
      {loading && !governance ? (
        <p className="mt-3 text-xs text-op-text-dim">Loading governance state…</p>
      ) : (
        <dl className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
          <div>
            <dt className="text-op-text-dim">Health status</dt>
            <dd className={governance?.status === "healthy" ? "text-op-accent" : "text-op-danger"}>
              {governance?.status ?? "unknown"}
            </dd>
          </div>
          <div>
            <dt className="text-op-text-dim">Beacon runtime</dt>
            <dd className={governance?.beaconStatus === "verified_v2" ? "text-op-accent" : "text-op-amber"}>
              {governance?.beaconStatus ?? beacon?.runtimeStatus ?? "unknown"}
            </dd>
          </div>
          <div>
            <dt className="text-op-text-dim">Beacon verified</dt>
            <dd className={governance?.beaconVerified ? "text-op-accent" : "text-op-danger"}>
              {governance?.beaconVerified ? "yes" : "no"}
            </dd>
          </div>
          <div>
            <dt className="text-op-text-dim">Receipt authority</dt>
            <dd className={governance?.receiptAuthorityAvailable ? "text-op-accent" : "text-op-danger"}>
              {governance?.receiptAuthorityAvailable ? "available" : "unavailable"}
            </dd>
          </div>
          <div>
            <dt className="text-op-text-dim">Pending approvals</dt>
            <dd>{governance?.pendingApprovals ?? 0}</dd>
          </div>
          <div>
            <dt className="text-op-text-dim">Expired approvals</dt>
            <dd>{governance?.expiredApprovals ?? 0}</dd>
          </div>
          <div>
            <dt className="text-op-text-dim">Audit-incomplete</dt>
            <dd className={(governance?.auditIncompleteExecutions ?? 0) > 0 ? "text-op-amber" : ""}>
              {governance?.auditIncompleteExecutions ?? 0}
            </dd>
          </div>
          <div>
            <dt className="text-op-text-dim">MCP deltas (quarantined)</dt>
            <dd>{governance?.mcpDeltasAwaitingReview ?? 0}</dd>
          </div>
          <div className="col-span-2">
            <dt className="text-op-text-dim">Legacy bypass</dt>
            <dd className="text-op-accent">blocked in staging/production</dd>
          </div>
          <div className="col-span-2 font-mono text-[10px] text-op-text-dim">
            active beacon {truncateHash(beacon?.hash ?? "")}
          </div>
        </dl>
      )}
    </div>
  );
}
