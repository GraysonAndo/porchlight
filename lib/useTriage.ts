"use client";

import { useEffect } from "react";
import { ai } from "./ai";
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

  useEffect(() => {
    if (!hydrated || triage) return;
    let cancelled = false;
    ai.triageRequest({ description: request.description, photos: request.photos }).then((result) => {
      if (!cancelled) actions.setTriage(result);
    });
    return () => {
      cancelled = true;
    };
  }, [hydrated, triage, request.description, request.photos, actions]);

  return { request, triage, hasRealRequest: state.request !== null };
}
