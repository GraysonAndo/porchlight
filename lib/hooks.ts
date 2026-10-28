"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import { demoToday } from "./demoDate";

const subscribeNever = () => () => {};

function todayIso(): string {
  const d = demoToday();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

/** Today's local date as YYYY-MM-DD. Empty string on the server, so hydration never mismatches. */
export function useToday(): string {
  return useSyncExternalStore(subscribeNever, todayIso, () => "");
}

/** How long an AI step may take before the screen stops waiting and offers a way forward. */
export const AI_TIMEOUT_MS = 8000;

/**
 * Runs an async function whenever `key` changes and returns its latest result.
 * `loading` is true until the result for the current key has arrived, so stale
 * results from older keys are never shown. Pass `null` to do nothing.
 *
 * It never waits forever: after the timeout (or if the function throws) `loading` ends and `timedOut` or `failed`
 * is true, and `retry()` tries again. A late answer from a try that was given up on is ignored.
 */
export function useAsyncResult<T>(key: string | null, run: () => Promise<T>, timeoutMs: number = AI_TIMEOUT_MS) {
  const [result, setResult] = useState<{ key: string; value: T } | null>(null);
  const [problem, setProblem] = useState<{ key: string; attempt: number; kind: "timeout" | "error" } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const runRef = useRef(run);

  useEffect(() => {
    runRef.current = run;
  });

  useEffect(() => {
    if (key === null) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      if (!cancelled) setProblem({ key, attempt, kind: "timeout" });
    }, timeoutMs);
    runRef
      .current()
      .then((value) => {
        if (cancelled) return;
        clearTimeout(timer);
        setProblem(null);
        setResult({ key, value });
      })
      .catch(() => {
        if (cancelled) return;
        clearTimeout(timer);
        setProblem({ key, attempt, kind: "error" });
      });
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [key, attempt, timeoutMs]);

  const ready = key !== null && result !== null && result.key === key;
  const stuck = !ready && problem !== null && problem.key === key && problem.attempt === attempt ? problem.kind : null;
  return {
    data: ready ? result.value : null,
    loading: key !== null && !ready && stuck === null,
    timedOut: stuck === "timeout",
    failed: stuck === "error",
    retry: () => {
      setProblem(null);
      setAttempt((n) => n + 1);
    },
  };
}
