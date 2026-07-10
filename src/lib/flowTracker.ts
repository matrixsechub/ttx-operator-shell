import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { getOrCreateSessionId, readTrafficSourceFromUrl } from "./usageBeacon";

export type FlowTrackerEvent =
  | "page_view"
  | "click"
  | "cta_impression"
  | "cta_click"
  | "form_start"
  | "form_submit";

export interface FlowTrackerPayload {
  event: FlowTrackerEvent;
  sessionId: string;
  page: string;
  trafficSource?: string;
  ctaId?: string;
  dwellMs?: number;
  formId?: string;
  clickDelta?: number;
}

function sendFlowEvent(payload: FlowTrackerPayload): void {
  void fetch("/api/flow/event", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => {
    // Best-effort — never block navigation.
  });
}

export function recordFlowEvent(
  event: FlowTrackerEvent,
  options: {
    page?: string;
    ctaId?: string;
    dwellMs?: number;
    formId?: string;
    clickDelta?: number;
  } = {},
): void {
  const page = options.page ?? window.location.pathname;
  sendFlowEvent({
    event,
    sessionId: getOrCreateSessionId(),
    page,
    trafficSource: readTrafficSourceFromUrl(),
    ctaId: options.ctaId,
    dwellMs: options.dwellMs,
    formId: options.formId,
    clickDelta: options.clickDelta,
  });
}

export function FlowTracker() {
  const location = useLocation();
  const pageEnteredAt = useRef(Date.now());
  const clickCount = useRef(0);
  const previousPage = useRef<string | null>(null);
  const impressedCtas = useRef(new Set<string>());

  useEffect(() => {
    const page = location.pathname || "/";
    const dwellMs = previousPage.current ? Date.now() - pageEnteredAt.current : 0;
    const clickDelta = clickCount.current;

    recordFlowEvent("page_view", {
      page,
      dwellMs: previousPage.current ? dwellMs : undefined,
      clickDelta: clickDelta > 0 ? clickDelta : undefined,
    });

    previousPage.current = page;
    pageEnteredAt.current = Date.now();
    clickCount.current = 0;
    impressedCtas.current.clear();
  }, [location.pathname]);

  useEffect(() => {
    function onClick() {
      clickCount.current += 1;
    }

    function onCtaClick(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const cta = target.closest("[data-flow-cta]");
      if (!(cta instanceof HTMLElement)) return;
      recordFlowEvent("cta_click", { ctaId: cta.dataset.flowCta });
    }

    function onFormFocus(event: FocusEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const form = target.closest("form");
      if (!(form instanceof HTMLFormElement)) return;
      if (form.dataset.flowStarted === "1") return;
      form.dataset.flowStarted = "1";
      recordFlowEvent("form_start", { formId: form.id || form.getAttribute("name") || undefined });
    }

    function flushDwell() {
      if (!previousPage.current) return;
      recordFlowEvent("page_view", {
        page: previousPage.current,
        dwellMs: Date.now() - pageEnteredAt.current,
        clickDelta: clickCount.current > 0 ? clickCount.current : undefined,
      });
    }

    document.addEventListener("click", onClick, { capture: true });
    document.addEventListener("click", onCtaClick, { capture: true });
    document.addEventListener("focusin", onFormFocus, { capture: true });
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") flushDwell();
    });
    window.addEventListener("pagehide", flushDwell);

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const element = entry.target;
          if (!(element instanceof HTMLElement)) continue;
          const ctaId = element.dataset.flowCta;
          if (!ctaId || impressedCtas.current.has(ctaId)) continue;
          impressedCtas.current.add(ctaId);
          recordFlowEvent("cta_impression", { ctaId });
        }
      },
      { threshold: 0.5 },
    );

    document.querySelectorAll("[data-flow-cta]").forEach((element) => observer.observe(element));

    return () => {
      document.removeEventListener("click", onClick, { capture: true });
      document.removeEventListener("click", onCtaClick, { capture: true });
      document.removeEventListener("focusin", onFormFocus, { capture: true });
      window.removeEventListener("pagehide", flushDwell);
      observer.disconnect();
    };
  }, []);

  return null;
}
