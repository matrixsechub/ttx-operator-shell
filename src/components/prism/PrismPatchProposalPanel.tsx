import { StatusPill } from "../StatusPill";
import type { PrismPatchProposal } from "../../lib/prismTriageTypes";
import { exportProposalText } from "../../lib/prismTriageService";

type Props = {
  proposal: PrismPatchProposal | null;
  loading: boolean;
  onRegenerate: () => void;
  actionLoading: boolean;
};

export function PrismPatchProposalPanel({ proposal, loading, onRegenerate, actionLoading }: Props) {
  if (loading) {
    return <p className="text-sm text-op-text-dim">Loading proposal…</p>;
  }
  if (!proposal) {
    return (
      <p className="text-sm text-op-text-dim">
        No patch proposal generated for this triage item yet.
      </p>
    );
  }

  async function copyJson() {
    await navigator.clipboard.writeText(JSON.stringify(proposal, null, 2));
  }

  async function copyText() {
    await navigator.clipboard.writeText(exportProposalText(proposal!));
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-sm uppercase tracking-widest text-op-text-dim">Patch proposal</h3>
        <StatusPill tone="warn">{proposal.risk} risk</StatusPill>
        <StatusPill tone="neutral">{proposal.estimatedComplexity}</StatusPill>
        <StatusPill tone="neutral">rev {proposal.governance.revision}</StatusPill>
      </div>

      <p className="text-sm">{proposal.objective}</p>

      <section>
        <h4 className="text-xs uppercase tracking-widest text-op-text-dim">Implementation steps</h4>
        <ol className="mt-2 list-decimal space-y-2 pl-5 text-sm">
          {proposal.implementationPlan.map((step) => (
            <li key={step.order}>
              <p>{step.description}</p>
              <p className="text-xs text-op-text-dim">{step.rationale}</p>
            </li>
          ))}
        </ol>
      </section>

      <section>
        <h4 className="text-xs uppercase tracking-widest text-op-text-dim">Test plan</h4>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
          {proposal.testPlan.map((test) => (
            <li key={`${test.testType}-${test.description}`}>
              [{test.testType}] {test.description}
              {test.required ? " (required)" : ""}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h4 className="text-xs uppercase tracking-widest text-op-text-dim">Telemetry requirements</h4>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-op-text-dim">
          {proposal.telemetryRequirements.map((req) => (
            <li key={req}>{req}</li>
          ))}
        </ul>
      </section>

      <section>
        <h4 className="text-xs uppercase tracking-widest text-op-text-dim">Governance</h4>
        <dl className="mt-2 space-y-1 text-xs text-op-text-dim">
          <div>advisoryOnly: {String(proposal.governance.advisoryOnly)}</div>
          <div>mutationAuthorized: {String(proposal.governance.mutationAuthorized)}</div>
          <div>operatorApprovalRequired: {String(proposal.governance.operatorApprovalRequired)}</div>
        </dl>
      </section>

      {proposal.ai_enrichment && (
        <section>
          <h4 className="text-xs uppercase tracking-widest text-op-text-dim">AI enrichment (advisory)</h4>
          <pre className="mt-2 whitespace-pre-wrap text-sm text-op-text">{proposal.ai_enrichment}</pre>
        </section>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={actionLoading}
          onClick={onRegenerate}
          className="rounded-sm border border-op-accent/50 px-3 py-2 text-xs uppercase tracking-widest text-op-accent disabled:opacity-50"
        >
          Regenerate proposal (new revision)
        </button>
        <button
          type="button"
          onClick={() => void copyJson()}
          className="rounded-sm border border-op-border px-3 py-2 text-xs uppercase tracking-widest text-op-text-dim"
        >
          Copy proposal JSON
        </button>
        <button
          type="button"
          onClick={() => void copyText()}
          className="rounded-sm border border-op-border px-3 py-2 text-xs uppercase tracking-widest text-op-text-dim"
        >
          Export proposal text
        </button>
      </div>
    </div>
  );
}
