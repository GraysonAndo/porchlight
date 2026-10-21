"use client";

import { useEffect, useState } from "react";
import { ai } from "./ai";
import { AI_TIMEOUT_MS } from "./hooks";
import { triageText } from "./triage";
import { SEED_REQUEST } from "./seed";
import { useDemo } from "./store";

/**
 * The current repair request and its triage result. If nobody has submitted a
 * request yet (for example the owner screens were opened directly), the seeded
 * request from the sample tenant is used. The mock AI runs once and the result is saved.
 */
export function useTriage() {
  const { state, actions, hydrated } = useDemo();
  const request = state.request ?? SEED_REQUEST;
  const triage = state.triage;
  const [attempt, setAttempt] = useState(0);
  const [stuckAttempt, setStuckAttempt] = useState<number | null>(null);

  useEffect(() => {
    if (!hydrated || triage) return;
    let cancelled = false;
    // If the reading takes too long or fails, stop waiting and let the person retry or use the plain rules.
    const timer = setTimeout(() => {
      if (!cancelled) setStuckAttempt(attempt);
    }, AI_TIMEOUT_MS);
    ai.triageRequest({ description: request.description, photos: request.photos })
      .then((result) => {
        if (cancelled) return;
        clearTimeout(timer);
        actions.setTriage(result);
      })
      .catch(() => {
        if (!cancelled) setStuckAttempt(attempt);
      });
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [hydrated, triage, request.description, request.photos, actions, attempt]);

  return {
    request,
    triage,
    hasRealRequest: state.request !== null,
    /** True when the reading is taking too long. The page offers Retry or the plain-rules reading. */
    stuck: !triage && stuckAttempt === attempt,
    retry: () => {
      setStuckAttempt(null);
      setAttempt((n) => n + 1);
    },
    /** The reading from plain rules, with no AI, for when the AI step does not answer. */
    plainRules: () => actions.setTriage(triageText(request.description)),
  };
}
