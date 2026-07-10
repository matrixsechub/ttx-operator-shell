import { Link } from "react-router-dom";
import { StatusPill } from "./StatusPill";
import { useApiResource } from "../lib/useApiResource";
import { api } from "../lib/apiClient";
import { operatorDashboardService } from "../lib/operatorDashboardService";
import { labelForRuntimeHealth, toneForRuntimeHealth } from "../lib/runtimeHealth";

const POLL_MS = 12_000;

function truncateHash(hash: string): string {
  if (hash.length <= 14) return hash;
  return `${hash.slice(0, 6)}…${hash.slice(-6)}`;
}

function HeaderChip({
  label,
  value,
  tone,
  to,
}: {
  label: string;
  value: string;
  tone: "ok" | "warn" | "danger" | "neutral";
  to?: string;
}) {
  const inner = (
    <div className="flex min-w-0 flex-col gap-0.5 rounded-sm border border-op-border px-2.5 py-1.5 transition-colors hover:border-op-accent/40">
      <span className="text-[9px] uppercase tracking-widest text-op-text-dim">{label}</span>
      <StatusPill tone={tone}>{value}</StatusPill>
    </div>
  );

  if (to) {
    return (
      <Link to={to} className="min-w-0 shrink-0">
        {inner}
      </Link>
    );
  }

  return <div className="min-w-0 shrink-0">{inner}</div>;
}

export function GlobalCommandHeader() {
  const systemState = useApiResource(api.getSystemState, { pollIntervalMs: POLL_MS });
  const catalog = useApiResource(operatorDashboardService.getCatalog, { pollIntervalMs: POLL_MS * 2 });

  const state = systemState.result?.ok ? systemState.result.data.state : null;
  const beacon = state?.operatorOs?.beacon;
  const runtime = state?.runtimeHealth;
  const usage = state?.usage;
  const entitlements = (state?.marketplace?.entitlements as unknown[] | undefined) ?? [];
  const activationSafe = runtime?.activationSafeMode?.active ?? false;
  const beaconSafe = beacon?.safeMode ?? false;
  const policyMode = state?.policy?.mode ?? "standard";

  const safeModeLabel = beaconSafe
    ? "beacon halt"
    : activationSafe
      ? "activation"
      : policyMode === "RESTRICTIVE"
        ? "restrictive"
        : "normal";

  const safeModeTone =
    beaconSafe || activationSafe ? "danger" : policyMode === "RESTRICTIVE" ? "warn" : "ok";

  const runtimeState = runtime?.state ?? "WATCH";
  const catalogCount = catalog.result?.ok ? catalog.result.data.items.length : null;
  const marketplaceLabel =
    usage && catalogCount !== null
      ? `${usage.marketplaceClicks} clicks · ${catalogCount} items`
      : catalogCount !== null
        ? `${catalogCount} items`
        : "—";

  return (
    <div
      id="global-command-header"
      className="flex flex-wrap items-center gap-2 border-b border-op-border bg-op-panel/40 px-4 py-2 sm:px-6"
    >
      <HeaderChip
        label="Beacon"
        value={beacon?.hash ? truncateHash(beacon.hash) : "—"}
        tone={beaconSafe ? "danger" : beacon ? "ok" : "neutral"}
        to="/dashboard/beacon"
      />
      <HeaderChip label="Safe mode" value={safeModeLabel} tone={safeModeTone} to="/dashboard/runtime" />
      <HeaderChip
        label="Runtime"
        value={runtime ? `${labelForRuntimeHealth(runtimeState)} · ${runtime.score}` : "—"}
        tone={runtime ? toneForRuntimeHealth(runtimeState) : "neutral"}
        to="/dashboard/runtime"
      />
      <HeaderChip
        label="Marketplace"
        value={marketplaceLabel}
        tone={usage?.signalIntegrity === "INVALID_RATIOS" ? "warn" : "ok"}
        to="/dashboard/marketplace"
      />
      <HeaderChip
        label="Entitlements"
        value={`${entitlements.length} active`}
        tone={entitlements.length > 0 ? "ok" : "warn"}
        to="/dashboard/subscription"
      />
    </div>
  );
}
