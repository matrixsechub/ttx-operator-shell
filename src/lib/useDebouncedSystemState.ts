import { useEffect, useState } from "react";
import { api } from "./apiClient";
import type { SystemStateResponse } from "./types";
import { useApiResource } from "./useApiResource";

const POLL_INTERVAL_MS = 4_000;
const DEBOUNCE_MS = 300;

type SystemState = SystemStateResponse["state"];

export function useDebouncedSystemState() {
  const { result, loading } = useApiResource(api.getSystemState, { pollIntervalMs: POLL_INTERVAL_MS });
  const [state, setState] = useState<SystemState | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!result) return;
      if (result.ok) {
        setState(result.data.state);
        setError(null);
      } else {
        setError(result.error);
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [result]);

  const initialLoading = loading && state === null && error === null;

  return { state, loading: initialLoading, error, syncing: loading };
}
