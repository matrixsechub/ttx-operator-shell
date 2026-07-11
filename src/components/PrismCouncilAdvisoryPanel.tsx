import { Link } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";
import { councilService } from "../lib/councilService";
import type { PrismCouncilAdvisoryItem } from "../lib/councilTypes";
import { useApiResource } from "../lib/useApiResource";
import { StatusPill } from "./StatusPill";

function releaseTone(recommendation: string): "ok" | "warn" | "danger" | "neutral" {
  switch (recommendation) {
    case "PASS":
      return "ok";
    case "PASS_WITH_ADVISORIES":
      return "warn";
    case "CHANGES_REQUIRED":
      return "warn";
    case "BLOCK_RELEASE":
      return "danger";
    default:
      return "neutral";
  }
}

function AdvisoryCard({ item }: { item: PrismCouncilAdvisoryItem }) {
  return (
    <article className="rounded-sm border border-op-border p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] uppercase tracking-widest text-op-text-dim">Rank #{item.advisoryRank}</span>
        <StatusPill tone={releaseTone(item.releaseRecommendation)}>{item.releaseRecommendation}</StatusPill>
        <span className="text-xs text-op-text-dim">{item.overallScore}/100</span>
      </div>
      <p className="mt-3 text-sm text-op-text">{item.briefingSummary}</p>
      <dl className="mt-4 space-y-3 text-sm">
        <div>
          <dt className="text-[10px] uppercase tracking-widest text-op-text-dim">Problem frame</dt>
          <dd className="mt-1">{item.councilEnvelope.problemFrame}</dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-widest text-op-text-dim">Consensus</dt>
          <dd className="mt-1">{item.councilEnvelope.consensus}</dd>
        </div>
        {item.councilEnvelope.activeDisagreements.length > 0 && (
          <div>
            <dt className="text-[10px] uppercase tracking-widest text-op-text-dim">Active disagreements</dt>
            <dd className="mt-1">
              <ul className="list-disc pl-5">
                {item.councilEnvelope.activeDisagreements.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </dd>
          </div>
        )}
        <div>
          <dt className="text-[10px] uppercase tracking-widest text-op-text-dim">Recommended path</dt>
          <dd className="mt-1">{item.councilEnvelope.recommendedPath}</dd>
        </div>
      </dl>
      <p className="mt-4 text-[10px] uppercase tracking-widest text-op-text-dim">
        Routes: {item.routes.join(", ")} · {item.findingCount} findings ·{" "}
        <span className="font-mono normal-case">{item.evidenceHash.slice(0, 12)}…</span>
      </p>
      <p className="mt-2 text-[10px] text-op-text-dim">
        Read-only advisory intelligence. Cockpit review:{" "}
        <a href="/operator/uiux-expert" className="text-op-accent hover:underline">
          PRISM UI/UX Expert
        </a>
      </p>
    </article>
  );
}

function PrismCouncilAdvisoryContent() {
  const { result, loading, refresh } = useApiResource(councilService.getPacket);
  const advisories = result?.ok ? result.data.packet.prismAdvisories : null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xs uppercase tracking-widest text-op-text-dim">PRISM UI/UX advisories</h2>
          <p className="mt-1 text-xs text-op-text-dim">
            HSX council briefings are advisory-only. No approvals, mutations, or deployments are authorized here.
          </p>
        </div>
        <button
          type="button"
          onClick={() => refresh()}
          className="text-[10px] uppercase tracking-widest text-op-accent hover:underline"
        >
          {loading ? "syncing…" : "refresh"}
        </button>
      </div>

      {!result ? (
        <div className="op-panel rounded-sm p-3 text-xs text-op-text-dim">Loading PRISM advisories…</div>
      ) : !result.ok ? (
        <div className="op-panel rounded-sm border-op-danger/40 p-3 text-xs text-op-danger">
          PRISM advisories unavailable — {result.error}
        </div>
      ) : !advisories || advisories.items.length === 0 ? (
        <div className="op-panel rounded-sm p-3 text-xs text-op-text-dim">
          No persisted PRISM audits available for council briefing.
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="op-panel rounded-sm p-3 text-xs text-op-text-dim">
            Ranked {advisories.items.length} audit{advisories.items.length === 1 ? "" : "s"} from staging-validated
            PRISM persistence. Mutation authorized: false.
          </div>
          {advisories.items.map((item) => (
            <AdvisoryCard key={item.auditId} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

export function PrismCouncilAdvisoryPanel() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return (
      <div className="op-panel rounded-sm p-4 text-sm text-op-text-dim">
        Operator authentication is required to brief PRISM advisories in council.
        <Link to="/login" className="ml-2 text-op-accent hover:underline">
          Sign in
        </Link>
      </div>
    );
  }

  return <PrismCouncilAdvisoryContent />;
}
