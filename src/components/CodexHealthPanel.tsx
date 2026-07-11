import { useApiResource } from "../lib/useApiResource";
import { api } from "../lib/apiClient";

function truncateHash(hash: string): string {
  if (hash.length <= 16) return hash;
  return `${hash.slice(0, 8)}…${hash.slice(-8)}`;
}

export function CodexHealthPanel() {
  const { result, loading } = useApiResource(api.getSystemState, { pollIntervalMs: 30_000 });
  const codex = result?.ok ? result.data.state.operatorOs?.codex : null;

  return (
    <div className="op-panel rounded-sm p-4">
      <h2 className="text-xs uppercase tracking-widest text-op-text-dim">Codex Health</h2>
      {loading && !codex ? (
        <p className="mt-3 text-xs text-op-text-dim">Loading codex state…</p>
      ) : (
        <dl className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
          <div>
            <dt className="text-op-text-dim">Manifest version</dt>
            <dd>{codex?.manifestVersion ?? "unknown"}</dd>
          </div>
          <div>
            <dt className="text-op-text-dim">Drift count</dt>
            <dd className={(codex?.driftCount ?? 0) > 0 ? "text-op-amber" : ""}>{codex?.driftCount ?? 0}</dd>
          </div>
          <div className="col-span-2 font-mono text-[10px] text-op-text-dim">
            hash {truncateHash(codex?.manifestHash ?? "")}
          </div>
          <div className="col-span-2 text-op-text-dim">
            Last validated: {codex?.lastValidatedAt ?? "not run in CI yet"}
          </div>
          <div className="col-span-2 text-[10px] text-op-text-dim">
            Run <code className="text-op-accent">npm run codex:validate</code> locally or in CI for full inventory checks.
          </div>
        </dl>
      )}
    </div>
  );
}
