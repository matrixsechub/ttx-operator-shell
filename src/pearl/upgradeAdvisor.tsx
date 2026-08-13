/**
 * PEARL-SPECTRAL — UPGRADE ADVISOR UI (Track 6, live)
 * ---------------------------------------------------------------------------
 * Client surfaces for the recommendation engine's advisor projection
 * (POST /api/recommendation/evaluate):
 *
 *  - <AdvisorPanel/>  — operator dashboard: BEACON-voiced recommendation
 *    plus an OPERATOR-voiced action row. Rendered on an operator surface,
 *    which mounts no PRISM capture (policy); data-flow-cta attributes are
 *    still present so the markup stays capture-ready if a surface is ever
 *    reclassified.
 *  - <AdvisorHint/>   — public marketplace modal: tier hint / latent-grant
 *    explanation for the current anonymous subject.
 *
 * Option B: the advisor NEVER blocks — it explains what an upgrade would
 * activate and always names the stay-where-you-are path.
 * Token discipline: op-* / entity-* utilities only.
 */

import { useEffect, useState } from "react";
import { EntityVoice, type EntityName } from "../components/EntityVoice";
import { getOrCreateSessionId } from "../lib/usageBeacon";
import type { SubscriptionTier, UpgradePackKind } from "./qualificationContract";

export interface AdvisorEvaluation {
  subject: string;
  tier: SubscriptionTier;
  stage: string | null;
  recommendedTier: SubscriptionTier;
  recommendedPacks: { itemId: string; name: string; kind: UpgradePackKind; status: string; minimumTier: SubscriptionTier }[];
  nextAction: string;
  voice: EntityName;
  justification: string;
  advisor: { eligible: boolean; blockedBy: string[]; hint: string; voice: EntityName };
}

async function fetchEvaluation(init?: { headers?: Record<string, string> }): Promise<AdvisorEvaluation | null> {
  try {
    const response = await fetch("/api/recommendation/evaluate", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
      body: JSON.stringify({ sessionId: getOrCreateSessionId() }),
    });
    if (!response.ok) return null;
    return (await response.json()) as AdvisorEvaluation;
  } catch {
    return null;
  }
}

const NEXT_ACTION_LABEL: Record<string, string> = {
  "continue-onboarding": "Continue onboarding",
  "explore-experience": "Explore the ecosystem",
  "refine-blueprint": "Refine your blueprint",
  "acquire-pack": "Review recommended packs",
  "upgrade-tier": "Review the upgrade path",
  "enter-cockpit": "You are mission-ready",
};

/** Dashboard advisor panel (operator cockpit). */
export function AdvisorPanel() {
  const [evaluation, setEvaluation] = useState<AdvisorEvaluation | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetchEvaluation().then((result) => {
      if (!cancelled) {
        setEvaluation(result);
        setLoaded(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!loaded) {
    return (
      <section className="op-panel rounded-sm p-4">
        <h2 className="text-xs uppercase tracking-widest text-op-accent">Upgrade Advisor</h2>
        <p className="mt-2 text-xs text-op-text-dim">Evaluating…</p>
      </section>
    );
  }
  if (!evaluation) {
    return (
      <section className="op-panel rounded-sm p-4">
        <h2 className="text-xs uppercase tracking-widest text-op-accent">Upgrade Advisor</h2>
        <p className="mt-2 text-xs text-op-text-dim">Advisor unavailable — the recommendation surface did not respond.</p>
      </section>
    );
  }

  return (
    <section className="op-panel flex flex-col gap-3 rounded-sm p-4" aria-label="Upgrade advisor">
      <div className="flex items-center justify-between">
        <h2 className="text-xs uppercase tracking-widest text-op-accent">Upgrade Advisor</h2>
        <span className="text-[10px] uppercase tracking-wider text-op-text-dim">
          tier {evaluation.tier} → rec {evaluation.recommendedTier}
        </span>
      </div>

      <EntityVoice entity={evaluation.advisor.voice}>{evaluation.advisor.hint}</EntityVoice>
      <p className="text-xs text-op-text-dim">{evaluation.justification}</p>

      {evaluation.recommendedPacks.length > 0 && (
        <ul className="flex flex-col gap-1 text-xs">
          {evaluation.recommendedPacks.map((pack) => (
            <li key={pack.itemId} className="flex items-center justify-between gap-2">
              <span className="text-op-text">{pack.name}</span>
              <span
                className={
                  pack.status === "held"
                    ? "text-entity-aurelius"
                    : pack.status === "eligible"
                      ? "text-op-accent"
                      : "text-op-amber"
                }
              >
                {pack.status === "needs-tier" ? `needs ${pack.minimumTier}` : pack.status}
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center justify-between gap-2 border-t border-op-border pt-3">
        <EntityVoice entity="operator">the decision stays yours — advisor output is advisory.</EntityVoice>
        <a
          href={evaluation.nextAction === "acquire-pack" || evaluation.nextAction === "upgrade-tier" ? "/marketplace" : "/onboarding"}
          data-flow-cta={`advisor-${evaluation.nextAction}`}
          className="shrink-0 rounded-sm border border-op-accent/60 bg-op-accent/10 px-3 py-1.5 text-[11px] uppercase tracking-widest text-op-accent hover:bg-op-accent/20"
        >
          {NEXT_ACTION_LABEL[evaluation.nextAction] ?? "Review"}
        </a>
      </div>
    </section>
  );
}

/** Marketplace modal hint (public storefront). */
export function AdvisorHint({ itemName, requiresTier }: { itemName: string; requiresTier?: string }) {
  const [evaluation, setEvaluation] = useState<AdvisorEvaluation | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchEvaluation().then((result) => {
      if (!cancelled) setEvaluation(result);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const tierLine = requiresTier
    ? `${itemName} activates at ${requiresTier.toUpperCase()}; it stays latent — never lost — if acquired below that.`
    : evaluation?.advisor.hint ?? "Checking the upgrade path…";

  return (
    <div className="flex flex-col gap-2" data-flow-cta="advisor-hint">
      <EntityVoice entity="beacon">{tierLine}</EntityVoice>
      {evaluation && (
        <p className="text-[11px] text-op-text-dim">
          Current tier: <span className="text-op-text">{evaluation.tier.toUpperCase()}</span> · recommended:{" "}
          <span className="text-entity-aurelius">{evaluation.recommendedTier.toUpperCase()}</span> · browsing stays open
          at every tier.
        </p>
      )}
    </div>
  );
}
