import { createContext, useContext, useState, type ReactNode } from "react";
import { useApiResource } from "../../lib/useApiResource";
import { ttxService } from "./service";
import type { TTXScenario } from "./types";

// Tracks which TTX scenario the operator is currently working with, shared
// across the /ttx/* tabs (Builder, Injects, Timeline, Score) via Outlet
// siblings. Replaces the hardcoded "draft" scenario id that each tab used to
// reference independently. No persistence beyond this session — selection
// resets on reload, same as the rest of this UI-only scaffold.
interface ScenarioContextValue {
  scenarios: TTXScenario[];
  loading: boolean;
  error: string | null;
  selectedScenarioId: string | null;
  selectScenario: (id: string | null) => void;
  refreshScenarios: () => void;
}

const ScenarioContext = createContext<ScenarioContextValue | null>(null);

export function ScenarioProvider({ children }: { children: ReactNode }) {
  const { result, loading, refresh } = useApiResource(ttxService.listScenarios);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null);

  const scenarios = result?.ok ? result.data.scenarios : [];
  const error = result && !result.ok ? result.error : null;

  return (
    <ScenarioContext.Provider
      value={{
        scenarios,
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
