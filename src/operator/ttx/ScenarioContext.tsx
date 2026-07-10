import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { useApiResource } from "../../lib/useApiResource";
import type { TtxLocalScenario } from "../../lib/ttxTypes";
import { loadMergedScenarios, type MergedScenarioResult } from "./scenarioBridge";
import type { TTXScenario } from "./types";

interface ScenarioContextValue {
  scenarios: TTXScenario[];
  localById: Record<string, TtxLocalScenario>;
  loading: boolean;
  error: string | null;
  selectedScenarioId: string | null;
  selectScenario: (id: string | null) => void;
  refreshScenarios: () => void;
}

const ScenarioContext = createContext<ScenarioContextValue | null>(null);

export function ScenarioProvider({ children }: { children: ReactNode }) {
  const { result, loading, refresh } = useApiResource<MergedScenarioResult>(loadMergedScenarios);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null);

  const scenarios = result?.ok ? result.data.scenarios : [];
  const localById = useMemo(
    () => (result?.ok ? result.data.localById : {}),
    [result],
  );
  const error = result && !result.ok ? result.error : null;

  return (
    <ScenarioContext.Provider
      value={{
        scenarios,
        localById,
        loading,
        error,
        selectedScenarioId,
        selectScenario: setSelectedScenarioId,
        refreshScenarios: refresh,
      }}
    >
      {children}
    </ScenarioContext.Provider>
  );
}

export function useScenarioContext(): ScenarioContextValue {
  const ctx = useContext(ScenarioContext);
  if (!ctx) {
    throw new Error("useScenarioContext must be used within a ScenarioProvider");
  }
  return ctx;
}
