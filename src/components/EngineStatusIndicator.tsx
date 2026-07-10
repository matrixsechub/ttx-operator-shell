import { StatusPill } from "./StatusPill";
import { api } from "../lib/apiClient";
import { frontendBuildMetadata } from "../operator/ttx/scenarioBridge";
import { useApiResource } from "../lib/useApiResource";

function shortSha(sha: string): string {
  return sha.length > 8 ? sha.slice(0, 8) : sha;
}

export function EngineStatusIndicator() {
  const health = useApiResource(api.engineHealth, { pollIntervalMs: 30_000 });
  const version = useApiResource(api.engineVersion);
  const buildInfo = useApiResource(api.buildInfo);
  const bundled = frontendBuildMetadata();

  const online = health.result?.ok && health.result.data.status === "ok";
  const statusLabel = health.loading && !health.result ? "checking…" : online ? "Online" : "Unknown";
  const versionLabel = version.result?.ok ? `v${version.result.data.version}` : version.loading ? "…" : "unknown";
  const commitSha =
    (buildInfo.result?.ok ? buildInfo.result.data.commitSha : undefined) ??
    (version.result?.ok ? version.result.data.commitSha : undefined) ??
    bundled.commitSha;
  const deployEnv =
    (buildInfo.result?.ok ? buildInfo.result.data.deployEnv : undefined) ??
    (health.result?.ok ? health.result.data.env : undefined) ??
    "unknown";

  return (
    <div id="engine-status-indicator" className="op-panel flex flex-wrap items-center gap-2 rounded-sm p-2.5 text-[11px]">
      <StatusPill tone={!health.result ? "neutral" : online ? "ok" : "danger"}>{statusLabel}</StatusPill>
      <span className="text-op-text-dim">
        engine <span className="text-op-text">{versionLabel}</span>
      </span>
      <span className="text-op-text-dim/60 uppercase tracking-widest">{deployEnv}</span>
      <span className="text-op-text-dim" title={commitSha}>
        build <span className="text-op-text">{shortSha(commitSha)}</span>
      </span>
    </div>
  );
}
