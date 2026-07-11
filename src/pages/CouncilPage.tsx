import { GovernanceStatePanel } from "../components/GovernanceStatePanel";
import { PrismCouncilAdvisoryPanel } from "../components/PrismCouncilAdvisoryPanel";
import { Link } from "react-router-dom";

/** Governance / council surface — FedGrade and policy oversight entry. */
export function CouncilPage() {
  return (
    <div className="min-h-dvh bg-op-bg px-6 py-12 text-op-text">
      <div className="mx-auto max-w-3xl">
        <p className="text-[11px] uppercase tracking-[0.35em] text-op-text-dim">MatrixSecHub // Governance</p>
        <h1 className="mt-3 text-2xl uppercase tracking-[0.2em] text-op-accent">Operator Council</h1>
        <p className="mt-4 text-sm leading-relaxed text-op-text-dim">
          Governance surface for policy review, FedGrade posture, and cross-division oversight. Cockpit
          execution remains on <code className="text-op-accent">/ops/*</code> and{" "}
          <code className="text-op-accent">/systems</code>.
        </p>

        <div className="mt-8">
          <GovernanceStatePanel />
        </div>

        <div className="mt-8">
          <PrismCouncilAdvisoryPanel />
        </div>

        <div className="mt-8 flex flex-wrap gap-4">
          <Link to="/ops/fedgrade" className="rounded-sm border border-op-accent/40 px-6 py-2 text-xs uppercase tracking-widest text-op-accent">
            FedGrade Ops
          </Link>
          <Link to="/ops/security" className="rounded-sm border border-op-accent-2/40 px-6 py-2 text-xs uppercase tracking-widest text-op-accent-2">
            Security Ops
          </Link>
          <a href="/" className="rounded-sm border border-op-text-dim/30 px-6 py-2 text-xs uppercase tracking-widest text-op-text-dim">
            Storefront Entry
          </a>
        </div>
      </div>
    </div>
  );
}
