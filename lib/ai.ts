// The one place that decides which AI provider the app uses.
// To switch to a real model, point this at a provider that calls a server route.

import { mockAI } from "./mockAI";
import type { AIProvider } from "./types";

export const ai: AIProvider = mockAI;
