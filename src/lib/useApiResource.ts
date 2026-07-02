import { useCallback, useEffect, useRef, useState } from "react";
import type { ApiResult } from "./apiClient";

interface UseApiResourceOptions {
  pollIntervalMs?: number;
}

export function useApiResource<T>(fetcher: () => Promise<ApiResult<T>>, options: UseApiResourceOptions = {}) {
  const [result, setResult] = useState<ApiResult<T> | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastFetchedAt, setLastFetchedAt] = useState<Date | null>(null);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const refresh = useCallback(async () => {
    setLoading(true);
    const next = await fetcherRef.current();
    setResult(next);
    setLoading(false);
    if (next.ok) {
      setLastFetchedAt(new Date());
    }
  }, []);

  useEffect(() => {
    refresh();
    if (!options.pollIntervalMs) return;
    const id = setInterval(refresh, options.pollIntervalMs);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refresh, options.pollIntervalMs]);

  return { result, loading, lastFetchedAt, refresh };
}
