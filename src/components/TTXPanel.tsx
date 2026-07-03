import { useEffect, useState } from "react";
import { InfoCard } from "./InfoCard";
import { useApiResource } from "../lib/useApiResource";
import { ttxSessionService } from "../lib/ttxSessionService";
import { getCurrentSessionId, setCurrentSessionId, clearCurrentSessionId } from "../lib/ttxSessionStorage";
import type { ApiResult } from "../lib/apiClient";
import type { TtxSessionState } from "../lib/ttxTypes";

const POLL_INTERVAL_MS = 30_000;

// TTX scenario graph engine widget (Phase 25) — multi-scenario, branching,
// session-based. Replaces Phase 24's single hardcoded linear TTXPanel.
// Not the TTX SaaS builder (src/operator/ttx/, still a UI-only scaffold
// with no real backend) — this is a separate, smaller, real feature that
// happens to share the "TTX" name.
//
// One active session tracked client-side (localStorage, see
// ttxSessionStorage.ts) — this is a single-operator cockpit, not a
// multi-session browser, matching the single-operator convention used
// everywhere else in this repo.
export function TTXPanel() {
  const [sessionId, setSessionId] = useState<string | null>(() => getCurrentSessionId());
  const [selectedScenarioId, setSelectedScenarioId] = useState("");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const { result: scenariosResult } = useApiResource(() => ttxSessionService.listScenarios(), {
    pollIntervalMs: POLL_INTERVAL_MS,
  });
  const scenarios = scenariosResult?.ok ? scenariosResult.data.scenarios : [];

  useEffect(() => {
    if (!selectedScenarioId && scenarios.length > 0) setSelectedScenarioId(scenarios[0].id);
  }, [scenarios, selectedScenarioId]);

  const {
    result: stateResult,
    loading,
    refresh,
  } = useApiResource(
    () =>
      sessionId
        ? ttxSessionService.getState(sessionId)
        : Promise.resolve<ApiResult<TtxSessionState>>({ ok: false, error: "No active session" }),
    { pollIntervalMs: POLL_INTERVAL_MS },
  );

  const state = stateResult?.ok ? stateResult.data : null;

  async function handleStart() {
    if (!selectedScenarioId) return;
    setBusy(true);
    setActionError(null);
    const response = await ttxSessionService.startSession(selectedScenarioId);
    if (response.ok) {
      setCurrentSessionId(response.data.sessionId);
      setSessionId(response.data.sessionId);
    } else {
      setActionError(response.error);
    }
    await refresh();
    setBusy(false);
  }

  async function handleNext(choice?: string) {
    if (!sessionId) return;
    setBusy(true);
    setActionError(null);
    const response = await ttxSessionService.nextPhase(sessionId, choice);
    if (!response.ok) setActionError(response.error);
    await refresh();
    setBusy(false);
  }

  async function handleReset() {
    if (!sessionId) return;
    setBusy(true);
    setActionError(null);
    await ttxSessionService.resetSession(sessionId);
    clearCurrentSessionId();
    setSessionId(null);
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

      {!sessionId && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <select
            value={selectedScenarioId}
            onChange={(event) => setSelectedScenarioId(event.target.value)}
            className="op-panel rounded-sm px-1.5 py-1 text-xs text-op-text focus:border-op-accent/60 focus:outline-none"
          >
            {scenarios.length === 0 && <option value="">loading scenarios…</option>}
            {scenarios.map((scenario) => (
              <option key={scenario.id} value={scenario.id}>
                {scenario.title} ({scenario.phaseCount} phases{scenario.roles.length > 0 ? `, ${scenario.roles.join("/")}` : ""})
              </option>
            ))}
          </select>
        </div>
      )}

      <InfoCard label={state ? `${state.scenarioTitle} — Current Phase` : "Current Phase"} className="mt-3">
        {!sessionId ? (
          <span className="text-xs italic text-op-text-dim">No active session.</span>
        ) : !stateResult || !stateResult.ok ? (
          <span className="text-xs italic text-op-danger">unavailable — {stateResult && !stateResult.ok ? stateResult.error : "checking…"}</span>
        ) : state?.done ? (
          <span className="text-sm text-op-accent">Scenario complete.</span>
        ) : (
          <div className="flex flex-col gap-1 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-op-text">{state?.title}</span>
              {state?.role && (
                <span className="rounded-sm border border-op-accent-2/40 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-op-accent-2">
                  {state.role}
                </span>
              )}
            </div>
            <span className="text-op-text-dim">{state?.inject}</span>
          </div>
        )}
      </InfoCard>

      {actionError && <p className="mt-2 text-[11px] italic text-op-danger">{actionError}</p>}

      <div className="mt-3 flex flex-wrap gap-2">
        {!sessionId ? (
          <button
            type="button"
            disabled={busy || !selectedScenarioId}
            onClick={handleStart}
            className="rounded-sm border border-op-border-bright px-3 py-1.5 text-[11px] uppercase tracking-widest text-op-text-dim transition-colors hover:border-op-accent/50 hover:text-op-accent disabled:cursor-not-allowed disabled:opacity-50"
          >
            Start Scenario
          </button>
        ) : state && !state.done && state.choices.length > 1 ? (
          state.choices.map((choice) => (
            <button
              key={choice.choice}
              type="button"
              disabled={busy}
              onClick={() => handleNext(choice.choice)}
              className="rounded-sm border border-op-border-bright px-3 py-1.5 text-[11px] uppercase tracking-widest text-op-text-dim transition-colors hover:border-op-accent/50 hover:text-op-accent disabled:cursor-not-allowed disabled:opacity-50"
            >
              {choice.label}
            </button>
          ))
        ) : (
          <button
            type="button"
            disabled={busy || !state || state.done}
            onClick={() => handleNext()}
            className="rounded-sm border border-op-border-bright px-3 py-1.5 text-[11px] uppercase tracking-widest text-op-text-dim transition-colors hover:border-op-accent/50 hover:text-op-accent disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next Phase
          </button>
        )}
        <button
          type="button"
          disabled={busy || !sessionId}
          onClick={handleReset}
          className="rounded-sm border border-op-border-bright px-3 py-1.5 text-[11px] uppercase tracking-widest text-op-text-dim transition-colors hover:border-op-danger/50 hover:text-op-danger disabled:cursor-not-allowed disabled:opacity-50"
        >
          Reset Scenario
        </button>
      </div>

      {state && state.history.length > 0 && (
        <div className="mt-3">
          <h3 className="text-[10px] uppercase tracking-widest text-op-text-dim/70">Timeline</h3>
          <ul className="mt-2 flex flex-col gap-1.5">
            {state.history.map((entry, index) => (
              <li key={`${entry.nodeId}-${index}`} className="rounded-sm border border-op-border-bright px-2.5 py-1.5 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-op-text">{entry.title}</span>
                  <span className="text-op-text-dim">{new Date(entry.at).toLocaleTimeString()}</span>
                </div>
                <span className="text-[10px] text-op-text-dim/70">{entry.inject}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
