import { useEffect, useRef, useState } from "react";
import {
  evaluateIntentCaptureTrigger,
  INTENT_TRIGGER_DWELL_MS,
  INTENT_TRIGGER_MIN_CLICKS,
  INTENT_TRIGGER_SCROLL_DEPTH,
  type IntentTriggerState,
} from "./intentCaptureTrigger";
import { getOrCreateSessionId, readTrafficSourceFromUrl, readStoredEntryUiMode } from "./usageBeacon";

export interface IntentCaptureContext {
  sessionId: string;
  source: string;
  page: string;
  uiMode: string;
  experimentId?: string;
  variant?: string;
  interactionDepth: {
    dwellMs: number;
    scrollDepth: number;
    clicks: number;
  };
}

function initialTriggerState(): IntentTriggerState {
  return {
    dwellMs: 0,
    scrollDepth: 0,
    clicks: 0,
    frictionOnPage: false,
    weakExperimentIntent: false,
    pageLoadedAt: Date.now(),
  };
}

export function useIntentCaptureTrigger(page: string) {
  const [visible, setVisible] = useState(false);
  const stateRef = useRef<IntentTriggerState>(initialTriggerState());
  const dismissedRef = useRef(false);

  useEffect(() => {
    stateRef.current = initialTriggerState();
    dismissedRef.current = false;
    setVisible(false);
  }, [page]);

  useEffect(() => {
    function onClick() {
      stateRef.current.clicks += 1;
      maybeShow();
    }

    function onScroll() {
      const doc = document.documentElement;
      const scrollable = doc.scrollHeight - window.innerHeight;
      stateRef.current.scrollDepth = scrollable > 0 ? window.scrollY / scrollable : 0;
      maybeShow();
    }

    function maybeShow() {
      if (dismissedRef.current || visible) return;
      stateRef.current.dwellMs = Date.now() - stateRef.current.pageLoadedAt;
      if (evaluateIntentCaptureTrigger(stateRef.current)) {
        setVisible(true);
      }
    }

    const dwellTimer = window.setInterval(() => {
      stateRef.current.dwellMs = Date.now() - stateRef.current.pageLoadedAt;
      maybeShow();
    }, 2_000);

    document.addEventListener("click", onClick, { capture: true });
    window.addEventListener("scroll", onScroll, { passive: true });

    void fetch(
      `/api/flow/experiment/assignment?sessionId=${encodeURIComponent(getOrCreateSessionId())}&page=${encodeURIComponent(page)}`,
    )
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (!payload?.experiment) return;
        const issue = payload.experiment.issue ?? "";
        stateRef.current.frictionOnPage =
          issue === "click_no_progression" || issue === "form_abandon" || issue === "high_exit_trap";
        stateRef.current.weakExperimentIntent =
          payload.status === "WINNING" && payload.variant === "B" && payload.outcome?.variantB?.views > 0;
        maybeShow();
      })
      .catch(() => {
        // Optional signal.
      });

    return () => {
      window.clearInterval(dwellTimer);
      document.removeEventListener("click", onClick, { capture: true });
      window.removeEventListener("scroll", onScroll);
    };
  }, [page, visible]);

  function dismiss() {
    dismissedRef.current = true;
    setVisible(false);
  }

  function getContext(): IntentCaptureContext {
    const state = stateRef.current;
    return {
      sessionId: getOrCreateSessionId(),
      source: readTrafficSourceFromUrl() ?? "direct",
      page,
      uiMode: readStoredEntryUiMode() ?? "DEFAULT",
      experimentId: document.body.dataset.flowExperimentId,
      variant: document.body.dataset.flowExperimentVariant ?? "A",
      interactionDepth: {
        dwellMs: Date.now() - state.pageLoadedAt,
        scrollDepth: state.scrollDepth,
        clicks: state.clicks,
      },
    };
  }

  return { visible, dismiss, getContext, triggerThresholds: {
    clicks: INTENT_TRIGGER_MIN_CLICKS,
    dwellMs: INTENT_TRIGGER_DWELL_MS,
    scrollDepth: INTENT_TRIGGER_SCROLL_DEPTH,
  } };
}
