import { SecurityPanel } from "../../components/SecurityPanel";
import { WebhookTriggerPanel } from "../dashboard/WebhookTriggerPanel";
import { EntityVoice } from "../../components/EntityVoice";

export function SecurityOps() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <header>
        <p className="text-xs uppercase tracking-widest text-op-text-dim">Operator cockpit</p>
        <h1 className="text-2xl font-semibold text-op-text">Security plane</h1>
        <p className="mt-2 text-sm text-op-text-dim">
          Live security signals, webhook integrity, and edge auth posture for mshops-public.
        </p>
        <EntityVoice entity="hsx">the security plane is watched continuously.</EntityVoice>
      </header>
      <SecurityPanel />
      <WebhookTriggerPanel />
    </div>
  );
}
