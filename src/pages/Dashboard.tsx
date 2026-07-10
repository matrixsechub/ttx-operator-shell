import { Link } from "react-router-dom";
import { GovernanceStatePanel } from "../components/GovernanceStatePanel";
import { OperatorShell } from "../components/OperatorShell";
import { SystemHUD } from "../components/SystemHUD";
import { SystemTelemetryPanel } from "../components/SystemTelemetryPanel";
import { EngineStatusIndicator } from "../components/EngineStatusIndicator";
import { TelemetryPanel } from "../components/TelemetryPanel";
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

export function Dashboard() {
  return (
    <OperatorShell telemetry={<SystemTelemetryPanel />}>
      <div className="flex flex-col gap-6">
        <SystemHUD />

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-lg uppercase tracking-widest text-op-accent">Operator Cockpit</h1>
            <p className="mt-1 text-xs text-op-text-dim">Session overview and quick actions.</p>
          </div>
          <EngineStatusIndicator />
        </div>

        <TelemetryPanel />

        <GovernanceStatePanel />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <div className="op-panel rounded-sm p-4">
            <h2 className="text-xs uppercase tracking-widest text-op-text-dim">Session</h2>
            <p className="mt-2 text-sm text-op-text">Operator link established</p>
            <p className="mt-1 text-[11px] text-op-text-dim">No active scenario</p>
          </div>

          <Link
            to="/marketplace"
            className="op-panel rounded-sm p-4 transition-colors hover:border-op-accent/50 hover:bg-op-accent/5"
          >
            <h2 className="text-xs uppercase tracking-widest text-op-text-dim">Marketplace</h2>
            <p className="mt-2 text-sm text-op-text">Browse the catalog</p>
            <p className="mt-1 text-[11px] text-op-accent">open &rarr;</p>
          </Link>

          <Link
            to="/status"
            className="op-panel rounded-sm p-4 transition-colors hover:border-op-accent/50 hover:bg-op-accent/5"
          >
            <h2 className="text-xs uppercase tracking-widest text-op-text-dim">Status</h2>
            <p className="mt-2 text-sm text-op-text">Harness &amp; API health</p>
            <p className="mt-1 text-[11px] text-op-accent">open &rarr;</p>
          </Link>
        </div>

        <div className="op-panel rounded-sm p-4 xl:hidden">
          <SystemTelemetryPanel compact />
        </div>

        <OperatorStatusRail />

        <div>
          <h2 className="mb-3 text-xs uppercase tracking-widest text-op-text-dim">Systems</h2>
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
      </div>
    </OperatorShell>
  );
}
