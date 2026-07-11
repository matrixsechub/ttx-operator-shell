import { useState } from "react";
import { Link } from "react-router-dom";
import { OperatorShell } from "../components/OperatorShell";
import { SystemTelemetryPanel } from "../components/SystemTelemetryPanel";
import { EngineStatusIndicator } from "../components/EngineStatusIndicator";
import { ApprovalQueuePanel } from "../components/ApprovalQueuePanel";
import { CodexHealthPanel } from "../components/CodexHealthPanel";
import { GovernanceHealthPanel } from "../components/GovernanceHealthPanel";
import { SecurityPanel } from "../components/SecurityPanel";
import { TTXPanel } from "../components/TTXPanel";
import { ScenarioAuthoringPanel } from "../components/ScenarioAuthoringPanel";
import { OperatorTimeline } from "./dashboard/OperatorTimeline";
import { MissionBoard } from "./dashboard/MissionBoard";
import { TelemetryRails } from "./dashboard/TelemetryRails";
import { OperatorLogbook } from "./dashboard/OperatorLogbook";
import { AlertSystem } from "./dashboard/AlertSystem";
import { OperatorStatusRail } from "./dashboard/OperatorStatusRail";
import { AINodeConsole } from "./dashboard/AINodeConsole";
import { OperatorInventory } from "./dashboard/OperatorInventory";
import { OperatorSignals } from "./dashboard/OperatorSignals";
import { FlowIntelligencePanel } from "./dashboard/FlowIntelligencePanel";
import { FlowExperimentPanel } from "./dashboard/FlowExperimentPanel";
import { IntentCapturePanel } from "./dashboard/IntentCapturePanel";
import { TTXStatusPanel } from "./dashboard/TTXStatusPanel";
import { TelemetryFeed } from "./dashboard/TelemetryFeed";
import { WebhookTriggerPanel } from "./dashboard/WebhookTriggerPanel";
import { api } from "../lib/apiClient";
import { useApiResource } from "../lib/useApiResource";

export function Dashboard() {
  const [legacyOpen, setLegacyOpen] = useState(false);
  const systemState = useApiResource(api.getSystemState, { pollIntervalMs: 12_000 });
  const state = systemState.result?.ok ? systemState.result.data.state : null;

  return (
    <OperatorShell telemetry={<SystemTelemetryPanel />}>
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-lg uppercase tracking-widest text-op-accent">Operator Cockpit</h1>
            <p className="mt-1 text-xs text-op-text-dim">Executive command surface — deep panels in sidebar nav.</p>
          </div>
          <EngineStatusIndicator />
        </div>

        <ApprovalQueuePanel limit={3} />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <GovernanceHealthPanel />
          <CodexHealthPanel />
        </div>

        {state && (state.operatorOs?.approvals.pending ?? 0) > 0 ? (
          <p className="text-[11px] text-op-text-dim">
            <Link to="/operator/governance" className="text-op-accent hover:underline">
              Open governance console →
            </Link>
            {" · "}
            <Link to="/dashboard/governance" className="text-op-accent hover:underline">
              legacy governance panel
            </Link>
          </p>
        ) : null}

        <div className="op-panel rounded-sm p-4 xl:hidden">
          <SystemTelemetryPanel compact />
        </div>

        <div className="op-panel rounded-sm p-4">
          <button
            type="button"
            onClick={() => setLegacyOpen((open) => !open)}
            className="flex w-full items-center justify-between text-left text-xs uppercase tracking-widest text-op-text-dim hover:text-op-accent"
          >
            <span>Legacy signals &amp; module panels</span>
            <span>{legacyOpen ? "−" : "+"}</span>
          </button>

          {legacyOpen ? (
            <div className="mt-4 flex flex-col gap-4">
              <OperatorStatusRail />
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <OperatorTimeline />
                <MissionBoard />
                <TelemetryRails />
                <OperatorLogbook />
                <AlertSystem />
                <AINodeConsole />
                <OperatorInventory />
                <OperatorSignals />
                <FlowIntelligencePanel />
                <FlowExperimentPanel />
                <IntentCapturePanel />
                <TTXStatusPanel />
                <TelemetryFeed />
                <WebhookTriggerPanel />
                <SecurityPanel />
                <TTXPanel />
                <ScenarioAuthoringPanel />
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </OperatorShell>
  );
}
