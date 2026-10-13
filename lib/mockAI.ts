// Mock AI provider. No network, no API key. Every method returns the seeded
// scenario after a short artificial delay so the UI shows a believable
// "thinking" state.
//
// To use a real model later, write another AIProvider (see README, "How to swap
// mockAI for the real Claude API") and change the one import in lib/ai.ts.

import { compareQuote } from "./quote";
import { usd } from "./format";
import type {
  AIProvider,
  LabelInput,
  LabelResult,
  QuoteCheckInput,
  QuoteCheckResult,
  TenantMessageInput,
  TriageInput,
  TriageResult,
  VendorMessageInput,
} from "./types";

export interface MockAIOptions {
  minDelayMs?: number;
  maxDelayMs?: number;
}

export function createMockAI(options: MockAIOptions = {}): AIProvider {
  const minDelay = options.minDelayMs ?? 800;
  const maxDelay = options.maxDelayMs ?? 1500;

  const think = () =>
    new Promise<void>((resolve) => {
      const ms = minDelay + Math.random() * Math.max(0, maxDelay - minDelay);
      setTimeout(resolve, ms);
    });

  return {
    async triageRequest(input: TriageInput): Promise<TriageResult> {
      void input; // Output is deterministic: the seeded water heater scenario.
      await think();
      return {
        category: "Plumbing",
        urgency: "urgent",
        summary:
          "The water heater is leaking from the bottom and the garage floor is wet. This needs a plumber soon. It is not an emergency unless the leak is large or water is reaching living areas.",
        likelyCause:
          "Tank failure or a corroded tank bottom. A leak from the bottom of the tank usually means the tank has worn through, not that a fitting came loose.",
        safetySteps: [
          "Turn off the water supply valve to the heater.",
          "Turn the gas valve to pilot or off.",
          "Keep items off the garage floor.",
          "Do not touch the heater if you are standing in water near anything electrical.",
        ],
        tenantQuestions: [
          "How fast is the leak: a slow drip, a steady stream, or a gush?",
          "Is any water reaching the living areas of the house?",
          "Do you smell gas near the heater?",
        ],
        suggestedTrade: "Licensed plumber",
        confidence: 0.82,
      };
    },

    async readLabel(input: LabelInput): Promise<LabelResult> {
      void input; // Any photo returns the same reading.
      await think();
      return {
        manufacturer: "Hearthline",
        model: "HL-40G-NG",
        serial: "15C0412-X",
        capacityGallons: 40,
        fuelType: "Natural gas",
        manufactureDate: "2015-03",
        ageYears: 11,
        confidence: 0.86,
        // The serial is the one low confidence field, so the human can fix it.
        fieldsNeedingReview: ["serial"],
      };
    },

    async checkQuote(input: QuoteCheckInput): Promise<QuoteCheckResult> {
      await think();
      // The comparison is real math (lib/quote.ts). Only the wording around it is "AI".
      const comparison = compareQuote(input.quote, input.item);
      const total = comparison.total;

      const flaggedLines: { line: string; reason: string }[] = [];
      for (const line of comparison.lines) {
        if (line.range && line.verdict === "high") {
          flaggedLines.push({
            line: line.label,
            reason: `${usd(line.amount)} is well above the typical ${usd(line.range.low)} to ${usd(line.range.high)} for labor on this job.`,
          });
        }
      }
      if (input.quote.lines.some((l) => l.id === "expansion")) {
        flaggedLines.push({
          line: "Expansion tank",
          reason: "Ask whether this is required for this setup. Some homes already have one or do not need one.",
        });
      }

      const overTop = Math.max(0, total.amount - total.range.high);
      const saveable = total.verdict === "slightly high" || total.verdict === "high";
      return {
        verdict: total.verdict,
        marketLow: total.range.low,
        marketHigh: total.range.high,
        flaggedLines,
        questionsToAsk: [
          "How many labor hours are in the estimate, and what is the hourly rate?",
          "Is the permit already included in the total, or is it extra?",
          "How long is the warranty on parts and on labor?",
        ],
        estimatedSavingsLow: saveable ? overTop : 0,
        estimatedSavingsHigh: saveable ? Math.round(overTop * 2) : 0,
      };
    },

    async draftVendorMessage(input: VendorMessageInput): Promise<string> {
      await think();
      const lines = [
        `Hello ${input.vendorName},`,
        "",
        `This is ${input.ownerName}. I would like to book you for this job at ${input.address}:`,
        "",
        `Job: ${input.jobDescription}`,
        `Your quote: ${usd(input.quoteTotal)}`,
        `Not to exceed: ${usd(input.notToExceed)}. Please call me before doing any work that would go over this amount.`,
        `Tenant access: ${input.accessWindow}.`,
        "",
        "Before we confirm, please send:",
        "1. Your contractor license number",
        "2. The warranty length on parts and on labor",
        "3. Whether the permit is included in the total",
      ];
      if (!input.licenseShown) {
        lines.push("", "Your quote did not show a license number. I need that before I can book.");
      }
      lines.push("", "Thank you,", input.ownerName);
      return lines.join("\n");
    },

    async draftTenantMessage(input: TenantMessageInput): Promise<string> {
      await think();
      return [
        `Hi ${input.tenantName},`,
        "",
        `This is ${input.ownerName}. I booked ${input.vendorName} to replace the water heater at ${input.address}.`,
        "",
        `Visit window: ${input.accessWindow}.`,
        "Please make sure they can get to the garage. Keep the water and gas valves off until they arrive.",
        "",
        "Text me if the time does not work or if the leak gets worse.",
        "",
        `Thanks,`,
        input.ownerName,
      ].join("\n");
    },
  };
}

export const mockAI: AIProvider = createMockAI();
