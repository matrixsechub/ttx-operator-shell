import { SecurityPanel } from "../../components/SecurityPanel";
import { WebhookTriggerPanel } from "../dashboard/WebhookTriggerPanel";

export function SecurityOps() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <header>
        <p className="text-xs uppercase tracking-widest text-zinc-500">Operator cockpit</p>
        <h1 className="text-2xl font-semibold text-zinc-100">Security plane</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Live security signals, webhook integrity, and edge auth posture for mshops-public.
        </p>
      </header>
      <SecurityPanel />
      <WebhookTriggerPanel />
    </div>
  );
}
