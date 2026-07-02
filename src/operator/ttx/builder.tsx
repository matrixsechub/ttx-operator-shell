import { useState } from "react";
import { InfoCard } from "../../components/InfoCard";
import { ttxService } from "./service";
import { useScenarioContext } from "./ScenarioContext";

// Scenario Builder UI. Save calls ttxService.createScenario for real — the
// engine doesn't expose /api/ttx/scenarios yet, so this will surface a real
// (graceful) error via ApiResult until that route exists. That's expected,
// same as the rest of this module.
export function TTXBuilder() {
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [division, setDivision] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const { selectScenario, refreshScenarios } = useScenarioContext();

  const canSave = title.trim().length > 0 && summary.trim().length > 0;

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    const result = await ttxService.createScenario({ title, summary, division: division || undefined });

    if (result.ok) {
      selectScenario(result.data.scenario.id);
      refreshScenarios();
      setSaveSuccess(true);
    } else {
      setSaveError(result.error);
    }
    setSaving(false);
  }

  return (
    <InfoCard label="Scenario Builder">
      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-xs text-op-text-dim">
          Scenario title
          <input
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="e.g. Perimeter Breach — Tier 2"
            className="op-panel rounded-sm px-3 py-2 text-sm text-op-text placeholder:text-op-text-dim/60 focus:border-op-accent/60 focus:outline-none"
          />
        </label>

        <label className="flex flex-col gap-1 text-xs text-op-text-dim">
          Summary
          <textarea
            value={summary}
            onChange={(event) => setSummary(event.target.value)}
            rows={3}
            placeholder="What this exercise tests and who it's for."
            className="op-panel rounded-sm px-3 py-2 text-sm text-op-text placeholder:text-op-text-dim/60 focus:border-op-accent/60 focus:outline-none"
          />
        </label>

        <label className="flex flex-col gap-1 text-xs text-op-text-dim">
          Owning division
          <input
            type="text"
            value={division}
            onChange={(event) => setDivision(event.target.value)}
            placeholder="e.g. Operations"
            className="op-panel rounded-sm px-3 py-2 text-sm text-op-text placeholder:text-op-text-dim/60 focus:border-op-accent/60 focus:outline-none"
          />
        </label>

        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={!canSave || saving}
            onClick={handleSave}
            className="self-start rounded-sm border border-op-border-bright px-4 py-2 text-xs uppercase tracking-widest text-op-text-dim transition-colors hover:border-op-accent/50 hover:text-op-accent disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-op-border-bright disabled:hover:text-op-text-dim"
          >
            {saving ? "saving…" : "Save Scenario"}
          </button>
          {saveSuccess && <span className="text-xs text-op-accent">Saved — selected as active scenario.</span>}
          {saveError && <span className="text-xs text-op-danger">Save failed — {saveError}</span>}
        </div>
      </div>
    </InfoCard>
  );
}
