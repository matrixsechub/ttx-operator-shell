import { InfoCard } from "../../components/InfoCard";
import { StatusPill } from "../../components/StatusPill";

type DeployStatus = "pass" | "idle" | "warn";
const DEPLOY_STEPS: { id: string; label: string; status: DeployStatus }[] = [
  { id: "1", label: "GH0ST-LAY3R circular import fix", status: "pass" },
  { id: "2", label: "Feature branch stabilization", status: "pass" },
  { id: "3", label: "Marketplace backend validation", status: "pass" },
  { id: "4", label: "MSHOPS harness deploy", status: "pass" },
  { id: "5", label: "mshops-public decommissioned — ttx canonical entry", status: "pass" },
  { id: "6", label: "Cross-repo integration", status: "idle" },
];

export function DeployOps() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <header>
        <p className="text-xs uppercase tracking-widest text-zinc-500">Operator cockpit</p>
        <h1 className="text-2xl font-semibold text-zinc-100">Coordinated deploy</h1>
        <p className="mt-2 text-sm text-zinc-400">
          MatrixSecHub deployment gate — Step 5 blocked until edge-auth parity is verified locally.
        </p>
      </header>
      <InfoCard label="Deploy ladder">
        <ul className="space-y-3">
          {DEPLOY_STEPS.map((step) => (
            <li key={step.id} className="flex items-center justify-between gap-4 text-sm">
              <span className="text-zinc-300">
                Step {step.id}: {step.label}
              </span>
              <StatusPill
                tone={step.status === "pass" ? "ok" : step.status === "warn" ? "warn" : "neutral"}
              >
                {step.status === "pass" ? "PASS" : step.status === "warn" ? "GATE" : "PENDING"}
              </StatusPill>
            </li>
          ))}
        </ul>
      </InfoCard>
      <InfoCard label="Hard rules">
        <ul className="list-inside list-disc space-y-1 text-sm text-zinc-300">
          <li>Do not deploy until Phase 5 gate passes</li>
          <li>Preserve HMAC-JWT, ctx binding, CSP, XFO DENY, rate limits</li>
          <li>Canonical entry: ttx-operator-shell.sogellagepul.workers.dev</li>
        </ul>
      </InfoCard>
    </div>
  );
}
