import { useMemo } from "react";
import { resolveAdaptiveEntryUiMode, type AdaptiveEntryUiMode } from "./adaptiveEntry";
import { api } from "./apiClient";
import type { BehaviorIntelligenceSnapshot } from "./types";
import { getOrCreateSessionId } from "./usageBeacon";
import { useApiResource } from "./useApiResource";

const BEHAVIOR_POLL_MS = 30_000;

export function useAdaptiveEntryMode(): {
  uiMode: AdaptiveEntryUiMode;
  behavior: BehaviorIntelligenceSnapshot | null;
  assignmentSource: "behavior" | "explore" | "biased" | "fallback" | null;
  loading: boolean;
} {
  const sessionId = useMemo(() => getOrCreateSessionId(), []);
  const { result: behaviorResult, loading: behaviorLoading } = useApiResource(api.getBehaviorIntelligence, {
    pollIntervalMs: BEHAVIOR_POLL_MS,
  });
  const { result: assignmentResult, loading: assignmentLoading } = useApiResource(
    () => api.getExperimentationAssignment(sessionId),
    { pollIntervalMs: BEHAVIOR_POLL_MS },
  );

  const behavior = behaviorResult?.ok ? behaviorResult.data.intelligence : null;
  const behaviorMode = useMemo(() => resolveAdaptiveEntryUiMode(behavior), [behavior]);

  const uiMode = assignmentResult?.ok
    ? assignmentResult.data.assignedMode
    : behaviorMode;

  const assignmentSource = assignmentResult?.ok
    ? assignmentResult.data.source
    : behaviorResult?.ok
      ? "fallback"
      : null;

  return {
    uiMode,
    behavior,
    assignmentSource,
    loading: behaviorLoading || assignmentLoading,
  };
}
