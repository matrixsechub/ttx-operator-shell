(function flowTracker() {
  const SESSION_KEY = "msh_session";
  const TRAFFIC_SOURCE_KEY = "msh_traffic_source";

  function getOrCreateSessionId() {
    try {
      const existing = localStorage.getItem(SESSION_KEY);
      if (existing) return existing;
      const sessionId = crypto.randomUUID();
      localStorage.setItem(SESSION_KEY, sessionId);
      return sessionId;
    } catch {
      return crypto.randomUUID();
    }
  }

  function readTrafficSource() {
    try {
      const src = new URLSearchParams(window.location.search).get("src");
      if (src) {
        const cleaned = src.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "_").slice(0, 32);
        if (cleaned) {
          sessionStorage.setItem(TRAFFIC_SOURCE_KEY, cleaned);
          return cleaned;
        }
      }
      return sessionStorage.getItem(TRAFFIC_SOURCE_KEY) || undefined;
    } catch {
      return undefined;
    }
  }

  const state = {
    page: window.location.pathname || "/",
    enteredAt: Date.now(),
    clickCount: 0,
    impressedCtas: new Set(),
    startedForms: new Set(),
  };

  function sendFlowEvent(payload) {
    const body = JSON.stringify({
      sessionId: getOrCreateSessionId(),
      trafficSource: readTrafficSource(),
      ...payload,
    });

    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: "application/json" });
      if (navigator.sendBeacon("/api/flow/event", blob)) return;
    }

    fetch("/api/flow/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {});
  }

  function recordPageView(page, dwellMs, clickDelta) {
    sendFlowEvent({
      event: "page_view",
      page,
      dwellMs: dwellMs > 0 ? dwellMs : undefined,
      clickDelta: clickDelta > 0 ? clickDelta : undefined,
    });
  }

  function flushCurrentPage() {
    const dwellMs = Date.now() - state.enteredAt;
    if (dwellMs > 0 || state.clickCount > 0) {
      recordPageView(state.page, dwellMs, state.clickCount);
    }
  }

  function trackInitialPage() {
    recordPageView(state.page, 0, 0);
  }

  function bindClicks() {
    document.addEventListener(
      "click",
      () => {
        state.clickCount += 1;
      },
      { capture: true },
    );

    document.addEventListener(
      "click",
      (event) => {
        const target = event.target;
        if (!(target instanceof Element)) return;
        const cta = target.closest("[data-flow-cta]");
        if (!(cta instanceof HTMLElement) || !cta.dataset.flowCta) return;
        sendFlowEvent({ event: "cta_click", page: state.page, ctaId: cta.dataset.flowCta });
      },
      { capture: true },
    );
  }

  function bindForms() {
    document.addEventListener(
      "focusin",
      (event) => {
        const target = event.target;
        if (!(target instanceof Element)) return;
        const form = target.closest("form");
        if (!(form instanceof HTMLFormElement)) return;
        const formId = form.id || form.getAttribute("name") || state.page;
        if (state.startedForms.has(formId)) return;
        state.startedForms.add(formId);
        sendFlowEvent({ event: "form_start", page: state.page, formId });
      },
      { capture: true },
    );

    document.querySelectorAll("form").forEach((form) => {
      form.addEventListener("submit", () => {
        const formId = form.id || form.getAttribute("name") || state.page;
        sendFlowEvent({ event: "form_submit", page: state.page, formId });
      });
    });
  }

  function bindCtaImpressions() {
    if (!("IntersectionObserver" in window)) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const element = entry.target;
          if (!(element instanceof HTMLElement) || !element.dataset.flowCta) return;
          const ctaId = element.dataset.flowCta;
          if (state.impressedCtas.has(ctaId)) return;
          state.impressedCtas.add(ctaId);
          sendFlowEvent({ event: "cta_impression", page: state.page, ctaId });
        });
      },
      { threshold: 0.5 },
    );

    document.querySelectorAll("[data-flow-cta]").forEach((element) => observer.observe(element));
  }

  function bindLifecycle() {
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") flushCurrentPage();
    });
    window.addEventListener("pagehide", flushCurrentPage);
  }

  function init() {
    trackInitialPage();
    bindClicks();
    bindForms();
    bindCtaImpressions();
    bindLifecycle();
    void loadExperimentAssignment();
  }

  async function loadExperimentAssignment() {
    try {
      const response = await fetch(
        `/api/flow/experiment/assignment?sessionId=${encodeURIComponent(getOrCreateSessionId())}&page=${encodeURIComponent(state.page)}`,
      );
      if (!response.ok) return;
      const payload = await response.json();
      if (payload.variant === "B" && payload.experiment) {
        document.body.dataset.flowExperimentVariant = "B";
        document.body.dataset.flowExperimentId = payload.experiment.id;
      }
    } catch {
      // Assignment is optional for rendering.
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.flowTracker = {
    recordFormSubmit(formId) {
      sendFlowEvent({ event: "form_submit", page: state.page, formId });
    },
  };
})();
