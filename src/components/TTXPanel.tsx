import { useState } from "react";
import { InfoCard } from "./InfoCard";
import { useApiResource } from "../lib/useApiResource";
import { ttxEngineService } from "../lib/ttxService";

const POLL_INTERVAL_MS = 30_000;

// Minimal TTX scenario engine scaffolding widget (Phase 24) — a single
// hardcoded scenario walked as a linear phase state machine via
// worker/ttx.ts. Not the TTX SaaS builder (src/operator/ttx/, still a
// UI-only scaffold with no real backend) — this is a separate, smaller,
// real feature that happens to share the "TTX" name.
export function TTXPanel() {
  const { result, loading, refresh } = useApiResource(() => ttxEngineService.getState(), {
    pollIntervalMs: POLL_INTERVAL_MS,
  });
  const [busy, setBusy] = useState(false);

  const state = result?.ok ? result.data : null;
  const started = state !== null && state.phaseIndex >= 0;

  async function handleStart() {
    setBusy(true);
    await ttxEngineService.startScenario();
    await refresh();
    setBusy(false);
  }

  async function handleNext() {
    setBusy(true);
    await ttxEngineService.nextPhase();
    await refresh();
    setBusy(false);
  }

  async function handleReset() {
    setBusy(true);
    await ttxEngineService.resetScenario();
    await refresh();
    setBusy(false);
  }

  return (
    <div id="ttx-panel" className="op-panel rounded-sm p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xs uppercase tracking-widest text-op-text-dim">TTX Scenario Engine</h2>
        <button
          type="button"
          onClick={() => refresh()}
          className="text-[10px] uppercase tracking-widest text-op-accent hover:underline"
        >
          {loading ? "syncing…" : "refresh"}
        </button>
      </div>

      <InfoCard label="Current Phase" className="mt-3">
        {!result || !result.ok ? (
          <span className="text-xs italic text-op-text-dim">
            unavailable{result && !result.ok ? ` — ${result.error}` : ""}
          </span>
        ) : !started ? (
          <span className="text-xs italic text-op-text-dim">Scenario not started.</span>
        ) : state?.done ? (
          <span className="text-sm text-op-accent">Scenario complete.</span>
        ) : (
          <div className="flex flex-col gap-1 text-xs">
            <span className="text-op-text">
              Phase {(state?.phaseIndex ?? 0) + 1} of {state?.total} — {state?.title}
            </span>
            <span className="text-op-text-dim">{state?.inject}</span>
          </div>
        )}
      </InfoCard>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy || started}
          onClick={handleStart}
          className="rounded-sm border border-op-border-bright px-3 py-1.5 text-[11px] uppercase tracking-widest text-op-text-dim transition-colors hover:border-op-accent/50 hover:text-op-accent disabled:cursor-not-allowed disabled:opacity-50"
        >
          Start Scenario
        </button>
        <button
          type="button"
          disabled={busy || !started || state?.done}
          onClick={handleNext}
          className="rounded-sm border border-op-border-bright px-3 py-1.5 text-[11px] uppercase tracking-widest text-op-text-dim transition-colors hover:border-op-accent/50 hover:text-op-accent disabled:cursor-not-allowed disabled:opacity-50"
        >
          Next Phase
        </button>
        <button
          type="button"
          disabled={busy || !started}
          onClick={handleReset}
          className="rounded-sm border border-op-border-bright px-3 py-1.5 text-[11px] uppercase tracking-widest text-op-text-dim transition-colors hover:border-op-danger/50 hover:text-op-danger disabled:cursor-not-allowed disabled:opacity-50"
        >
          Reset Scenario
        </button>
      </div>
    </div>
  );
}
