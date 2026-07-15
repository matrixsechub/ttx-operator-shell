import { SecurityPanel } from "../../components/SecurityPanel";
import { InfoCard } from "../../components/InfoCard";

export function FedGradeOps() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <header>
        <p className="text-xs uppercase tracking-widest text-op-text-dim">Operator cockpit</p>
        <h1 className="text-2xl font-semibold text-op-text">FedGrade posture</h1>
        <p className="mt-2 text-sm text-op-text-dim">
          Advisory compliance posture for the public edge. Health is gated by HMAC-JWT with ctx-hash binding.
        </p>
      </header>
      <InfoCard label="Edge contract">
        <ul className="list-inside list-disc space-y-1 text-sm text-op-text">
          <li>
            <code className="text-op-text">GET /api/fedgrade/health</code> — operator JWT required
          </li>
          <li>Ctx hash binds token to client IP + User-Agent</li>
          <li>Binding mismatch returns 403 with <code>binding_mismatch</code></li>
        </ul>
      </InfoCard>
      <SecurityPanel />
    </div>
  );
}
