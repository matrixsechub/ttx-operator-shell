/**
 * PEARL-SPECTRAL — PRISM TRACKER (Track 5, live)
 * ---------------------------------------------------------------------------
 * Mutation-aware impression engine for SPA surfaces. The Track 1–3 capture
 * layer observed [data-flow-cta] elements once at mount, so CTAs rendered
 * later (React route changes, modals, async lists) never emitted
 * cta_impression. This module fixes that with one IntersectionObserver +
 * one MutationObserver pair:
 *
 *  - every [data-flow-cta] element present now or added later is observed;
 *  - impressions dedupe per ctaId until reset (FlowTracker resets on route
 *    change so each page sees at most one impression per CTA);
 *  - CAPTURE POLICY (R12/R15): this module emits only through the caller's
 *    onImpression callback — which routes to /api/flow/event via
 *    flowTracker. It never opens its own capture channel, and it must not
 *    be mounted on operator surfaces (cockpit/auth/council).
 */

export interface PrismTrackerHandle {
  /** Forget impression dedupe state (call on SPA route change). */
  reset(): void;
  /** Disconnect all observers. */
  disconnect(): void;
}

export function mountPrismTracker(onImpression: (ctaId: string) => void): PrismTrackerHandle {
  const impressed = new Set<string>();

  const intersection =
    typeof IntersectionObserver !== "undefined"
      ? new IntersectionObserver(
          (entries) => {
            for (const entry of entries) {
              if (!entry.isIntersecting) continue;
              const element = entry.target;
              if (!(element instanceof HTMLElement)) continue;
              const ctaId = element.dataset.flowCta;
              if (!ctaId || impressed.has(ctaId)) continue;
              impressed.add(ctaId);
              onImpression(ctaId);
            }
          },
          { threshold: 0.5 },
        )
      : null;

  function observeWithin(root: ParentNode): void {
    if (!intersection) return;
    if (root instanceof HTMLElement && root.dataset.flowCta) {
      intersection.observe(root);
    }
    root.querySelectorAll?.("[data-flow-cta]").forEach((element) => intersection.observe(element));
  }

  observeWithin(document);

  const mutation =
    typeof MutationObserver !== "undefined"
      ? new MutationObserver((records) => {
          for (const record of records) {
            record.addedNodes.forEach((node) => {
              if (node instanceof HTMLElement) observeWithin(node);
            });
          }
        })
      : null;

  mutation?.observe(document.body, { childList: true, subtree: true });

  return {
    reset() {
      impressed.clear();
      // Re-observe the current DOM so CTAs that persist across routes can
      // impress again on the new page.
      observeWithin(document);
    },
    disconnect() {
      intersection?.disconnect();
      mutation?.disconnect();
    },
  };
}
