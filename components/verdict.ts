import type { Verdict } from "@/lib/types";
import type { Tone } from "./ui";

export const VERDICT_TONE: Record<Verdict, Tone> = {
  fair: "good",
  "slightly high": "caution",
  high: "urgent",
  low: "caution",
};

export const VERDICT_LABEL: Record<Verdict, string> = {
  fair: "Fair price",
  "slightly high": "Slightly high",
  high: "High",
  low: "Low",
};
