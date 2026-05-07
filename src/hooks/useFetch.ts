"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type UseFetchResult<T> = {
  data: T | null;
  error: string | null;
  loading: boolean;
  refetch: () => Promise<void>;
};

// Generic loader hook for read-only data. Pass a builder function so the
// caller can capture parameters in a stable closure; pass `null` to skip
// fetching (useful for dependent fetches).
export function useFetch<T>(
  load: (() => Promise<T>) | null,
  deps: React.DependencyList,
): UseFetchResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(load !== null);
  const requestId = useRef(0);

  const run = useCallback(async () => {
    if (!load) {
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }
    const myId = ++requestId.current;
    setLoading(true);
    setError(null);
    try {
      const result = await load();
      if (myId !== requestId.current) return;
      setData(result);
    } catch (err) {
      if (myId !== requestId.current) return;
      setError(err instanceof Error ? err.message : "読み込みに失敗しました");
      setData(null);
    } finally {
      if (myId === requestId.current) {
        setLoading(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    run();
    return () => {
      // bump request id so any in-flight callback's results are discarded
      requestId.current++;
    };
  }, [run]);

  return { data, error, loading, refetch: run };
}
