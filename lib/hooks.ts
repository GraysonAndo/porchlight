"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

const subscribeNever = () => () => {};

function todayIso(): string {
  const d = new Date();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

/** Today's local date as YYYY-MM-DD. Empty string on the server, so hydration never mismatches. */
export function useToday(): string {
  return useSyncExternalStore(subscribeNever, todayIso, () => "");
}

/**
 * Runs an async function whenever `key` changes and returns its latest result.
 * `loading` is true until the result for the current key has arrived, so stale
 * results from older keys are never shown. Pass `null` to do nothing.
 */
export function useAsyncResult<T>(key: string | null, run: () => Promise<T>) {
  const [result, setResult] = useState<{ key: string; value: T } | null>(null);
  const runRef = useRef(run);

  useEffect(() => {
    runRef.current = run;
  });

  useEffect(() => {
    if (key === null) return;
    let cancelled = false;
    runRef.current().then((value) => {
      if (!cancelled) setResult({ key, value });
    });
    return () => {
      cancelled = true;
    };
  }, [key]);

  const ready = key !== null && result !== null && result.key === key;
  return { data: ready ? result.value : null, loading: key !== null && !ready };
}
