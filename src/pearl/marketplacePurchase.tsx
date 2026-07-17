/**
 * PEARL-SPECTRAL — MARKETPLACE PURCHASE FLOW (Track 5, live)
 * ---------------------------------------------------------------------------
 * The M3 acquisition flow as a client component, rendered inside the
 * catalog detail modal for items carrying a pack-family tag:
 *
 *   M3-1 INTENT        AURELIUS — item + pack summary, acquire CTA
 *   M3-2 BILLING       HSX — sandbox instant grant, or Stripe redirect
 *   M3-3 CONFIRMATION  poll /api/billing/acquisition until settled
 *   M3-4 GRANTED       GHOST — the pack is now part of the operator's kit
 *
 * All server state comes from worker/marketplaceBillingWorker.ts; this
 * component holds only UI state. PRISM capture: every stage transition
 * emits a cta_click via recordFlowEvent; CTAs also carry data-flow-cta
 * for impression tracking. Token discipline: op-* / entity-* only.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { CatalogItem } from "../lib/types";
import { EntityVoice } from "../components/EntityVoice";
import { AdvisorHint } from "./upgradeAdvisor";
import { recordFlowEvent } from "../lib/flowTracker";
import { getOrCreateSessionId } from "../lib/usageBeacon";

const PACK_FAMILY_TAGS = ["agent-pack", "automation-pack", "scenario-pack", "intelligence-pack"] as const;

export function packFamilyOf(item: CatalogItem): string | null {
  return item.tags?.find((tag) => (PACK_FAMILY_TAGS as readonly string[]).includes(tag)) ?? null;
}

type PurchasePhase =
  | { phase: "intent" }
  | { phase: "billing" }
  | { phase: "confirmation"; acquisitionId: string }
  | { phase: "granted"; acquisitionId: string; sandbox: boolean }
  | { phase: "blocked"; reason: string; requiresTier?: string }
  | { phase: "failed"; reason: string };

interface CheckoutResponse {
  acquisitionId?: string;
  provider?: string;
  status?: string;
  sandbox?: boolean;
  checkoutUrl?: string;
  error?: string;
  tier?: string;
  requiresTier?: string;
}

export function MarketplacePurchase({ item }: { item: CatalogItem }) {
  const [state, setState] = useState<PurchasePhase>({ phase: "intent" });
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const family = packFamilyOf(item);

  const stopPolling = useCallback(() => {
    if (pollTimer.current) {
      clearTimeout(pollTimer.current);
      pollTimer.current = null;
    }
  }, []);

  useEffect(() => stopPolling, [stopPolling]);

  const poll = useCallback(
    (acquisitionId: string, attempt: number) => {
      if (attempt > 30) {
        setState({ phase: "failed", reason: "confirmation timed out — check back shortly" });
        return;
      }
      pollTimer.current = setTimeout(async () => {
        try {
          const response = await fetch(`/api/billing/acquisition?id=${encodeURIComponent(acquisitionId)}`);
          const payload = (await response.json()) as { status?: string; sandbox?: boolean };
          if (payload.status === "granted") {
            recordFlowEvent("cta_click", { ctaId: `acquire-granted-${item.id}` });
            setState({ phase: "granted", acquisitionId, sandbox: payload.sandbox === true });
            return;
          }
          if (payload.status === "failed") {
            setState({ phase: "failed", reason: "billing did not complete" });
            return;
          }
        } catch {
          // transient — keep polling
        }
        poll(acquisitionId, attempt + 1);
      }, 2000);
    },
    [item.id],
  );

  const beginAcquisition = useCallback(async () => {
    recordFlowEvent("cta_click", { ctaId: `acquire-confirm-${item.id}` });
    setState({ phase: "billing" });
    try {
      const response = await fetch("/api/billing/checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: item.id, sessionId: getOrCreateSessionId() }),
      });
      const payload = (await response.json()) as CheckoutResponse;

      if (response.status === 403) {
        setState({
          phase: "blocked",
          reason: payload.error ?? "tier does not permit acquisition",
          requiresTier: payload.requiresTier,
        });
        return;
      }
      if (!response.ok || !payload.acquisitionId) {
        setState({ phase: "failed", reason: payload.error ?? "billing is not available right now" });
        return;
      }
      if (payload.status === "granted") {
        recordFlowEvent("cta_click", { ctaId: `acquire-granted-${item.id}` });
        setState({ phase: "granted", acquisitionId: payload.acquisitionId, sandbox: payload.sandbox === true });
        return;
      }
      if (payload.checkoutUrl) {
        setState({ phase: "confirmation", acquisitionId: payload.acquisitionId });
        poll(payload.acquisitionId, 0);
        window.open(payload.checkoutUrl, "_blank", "noopener");
        return;
      }
      setState({ phase: "confirmation", acquisitionId: payload.acquisitionId });
      poll(payload.acquisitionId, 0);
    } catch {
      setState({ phase: "failed", reason: "billing is not reachable" });
    }
  }, [item.id, poll]);

  if (!family) return null;

  return (
    <div className="mt-4 flex flex-col gap-3 border-t border-op-border pt-4">
      {state.phase === "intent" && (
        <>
          <EntityVoice entity="aurelius">
            this is an acquirable {family.replace("-", " ")} — it extends your kit, it never replaces your tier.
          </EntityVoice>
          <button
            type="button"
            data-flow-cta={`catalog-acquire-${item.id}`}
            onClick={beginAcquisition}
            className="rounded-sm border border-op-accent/60 bg-op-accent/10 px-4 py-2 text-xs uppercase tracking-widest text-op-accent transition-colors hover:bg-op-accent/20"
          >
            Acquire {item.name}
          </button>
        </>
      )}

      {state.phase === "billing" && (
        <>
          <EntityVoice entity="hsx">billing runs on the provider's secured surface — credentials never touch this app.</EntityVoice>
          <p className="text-xs text-op-text-dim">Opening billing…</p>
        </>
      )}

      {state.phase === "confirmation" && (
        <>
          <EntityVoice entity="hsx">waiting for the provider to confirm — this settles automatically.</EntityVoice>
          <p className="text-xs text-op-text-dim">
            Confirmation pending (acquisition <span className="text-op-text">{state.acquisitionId.slice(0, 8)}…</span>)
          </p>
        </>
      )}

      {state.phase === "granted" && (
        <>
          <EntityVoice entity="ghost">
            granted — {item.name} is now part of your kit{state.sandbox ? " (sandbox mode)" : ""}.
          </EntityVoice>
          <p className="text-xs text-op-accent">Entitlement active. It appears in your resolved set immediately.</p>
        </>
      )}

      {state.phase === "blocked" && (
        <>
          <EntityVoice entity="beacon">
            acquisition requires the {state.requiresTier ?? "operator"} tier — your current tier can browse everything,
            acquire nothing.
          </EntityVoice>
          <p className="text-xs text-op-amber">{state.reason}</p>
          <AdvisorHint itemName={item.name} requiresTier={state.requiresTier ?? "operator"} />
        </>
      )}

      {state.phase === "failed" && (
        <>
          <EntityVoice entity="hsx">nothing was charged — the acquisition did not settle.</EntityVoice>
          <p className="text-xs text-op-danger">{state.reason}</p>
          <button
            type="button"
            data-flow-cta={`catalog-acquire-retry-${item.id}`}
            onClick={() => setState({ phase: "intent" })}
            className="self-start rounded-sm border border-op-border-bright px-3 py-1.5 text-[11px] uppercase tracking-widest text-op-text-dim hover:border-op-accent/50 hover:text-op-accent"
          >
            Back
          </button>
        </>
      )}
    </div>
  );
}
