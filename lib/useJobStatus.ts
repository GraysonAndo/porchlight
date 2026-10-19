"use client";

import { useEffect, useState } from "react";
import { APPROVED_MS, jobStatus, type JobStatus } from "./jobStatus";
import { useDemo } from "./store";

/** The job's status, which moves from approved to booked by itself a moment after approval. */
export function useJobStatus(): JobStatus {
  const { state } = useDemo();
  const [now, setNow] = useState(() => Date.now());
  const sentAt = state.approval ? Date.parse(state.approval.sentAt) : null;

  useEffect(() => {
    if (sentAt === null || !Number.isFinite(sentAt)) return;
    const wait = Math.max(0, sentAt + APPROVED_MS - Date.now()) + 50;
    const t = setTimeout(() => setNow(Date.now()), wait);
    return () => clearTimeout(t);
  }, [sentAt]);

  return jobStatus(state, now);
}
