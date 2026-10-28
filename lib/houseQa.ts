// Answers a tenant's questions about the home, using ONLY the house record and
// the lease data on file. Plain keyword rules, no AI, so it cannot make anything
// up. If the answer is not in the data, it says "I don't know" and suggests
// asking the owner.

import { ageOf } from "./life";
import { monthYear, usd } from "./format";
import { EQUIPMENT, PROPERTY, RENT_MONTH } from "./seed";
import type { WaterHeaterRecord } from "./types";

export interface HouseFacts {
  /** The water heater's record, or null if GoHome has not read its label yet */
  heater: WaterHeaterRecord | null;
  /** When this month's rent was marked paid (demo), or null */
  rentPaidAt: string | null;
}

export interface QaAnswer {
  /** True when the answer comes straight from the data on file */
  known: boolean;
  answer: string;
  /** Where the answer came from, shown under it */
  source: string | null;
}

export const LEASE_ANNIVERSARY = "December 14, 2026";
export const LEASE_ANNIVERSARY_ISO = "2026-12-14";

export const QA_SUGGESTIONS = [
  "How much is my rent?",
  "How old is the water heater?",
  "When is my lease anniversary?",
  "Can I have a dog?",
];

const has = (text: string, re: RegExp) => re.test(text);

function dontKnow(topic: string): QaAnswer {
  return {
    known: false,
    answer: `I don't know ${topic}. That is not in your house record or the lease details I have on file, and I won't guess. You can ask ${PROPERTY.owner}.`,
    source: null,
  };
}

const EQUIPMENT_WORDS: { id: string; re: RegExp; name: string }[] = [
  { id: "furnace", re: /furnace|heating system/, name: "furnace" },
  { id: "air-conditioner", re: /air condition|\ba\/c\b|\bac\b|cooling/, name: "air conditioner" },
  { id: "dishwasher", re: /dishwasher/, name: "dishwasher" },
  { id: "refrigerator", re: /fridge|refrigerator/, name: "refrigerator" },
  { id: "roof", re: /roof/, name: "roof" },
];

/** What the sample lease says about a late payment, from the same numbers the late rent card and the Pay page use. */
const LATE_TERMS = `Rent paid after a ${PROPERTY.graceDays}-day grace period has a ${usd(PROPERTY.lateFee)} late fee.`;

export function answerHouseQuestion(question: string, facts: HouseFacts): QaAnswer {
  const q = question.toLowerCase().trim();
  if (!q) return { known: true, answer: "Ask me anything about your home or your lease.", source: null };

  // Things the data cannot answer: say so before any keyword could be misread.
  if (has(q, /\b(pet|pets|dog|cat|animal)\b/)) return dontKnow("whether pets are allowed");
  if (has(q, /deposit/)) return dontKnow("about your security deposit");
  if (has(q, /parking|guest|smok|quiet hours|noise|subletting|sublet|roommate/)) return dontKnow("about that lease rule");
  if (has(q, /utilit|internet|wifi|trash|garbage/)) return dontKnow("who pays for that");
  if (has(q, /(owner|landlord).*(phone|number|email|contact|address)|(phone|number|email|contact).*(owner|landlord)/)) {
    return dontKnow(`how to reach ${PROPERTY.owner} by phone or email`);
  }

  // The lease terms GoHome does have: when rent is due and what a late payment costs.
  if (has(q, /late fee|late charge|grace period|late payment/)) {
    return { known: true, answer: LATE_TERMS, source: "Lease on file" };
  }

  // Rent
  if (has(q, /rent/)) {
    if (has(q, /paid|pay|payment|received|late/)) {
      return {
        known: true,
        answer: facts.rentPaidAt
          ? `Your ${RENT_MONTH} rent is marked paid.`
          : `Your ${RENT_MONTH} rent of ${usd(PROPERTY.rent)} is not marked paid yet. You can pay it from the My home page.`,
        source: "Rent status",
      };
    }
    if (has(q, /when|due|date|day/)) return { known: true, answer: `Rent of ${usd(PROPERTY.rent)} is due on the 1st of each month. ${LATE_TERMS}`, source: "Lease on file" };
    if (has(q, /increase|raise|go(es|ing)? up/)) {
      return { known: false, answer: `I don't know about any rent change. Nothing about one is on file. Any rent notice would come from ${PROPERTY.owner} in writing.`, source: null };
    }
    return { known: true, answer: `Your rent is ${usd(PROPERTY.rent)} per month.`, source: "Lease on file" };
  }

  // Lease
  if (has(q, /lease|renew|anniversary|move out|moving out/)) {
    if (has(q, /renew|end|expire|move out|moving out/) && !has(q, /anniversary/)) {
      return {
        known: true,
        answer: `Your lease anniversary is ${LEASE_ANNIVERSARY}. Whether it renews is up to you and ${PROPERTY.owner}, and I don't have that decision on file.`,
        source: "Lease on file",
      };
    }
    return { known: true, answer: `Your lease anniversary is ${LEASE_ANNIVERSARY}.`, source: "Lease on file" };
  }
  if (has(q, /how long|since when|when did i move|move(d)? in|tenant since/)) {
    return { known: true, answer: `You have lived here since ${PROPERTY.tenantSince}.`, source: "Lease on file" };
  }
  if (has(q, /address|where do i live/)) return { known: true, answer: `Your home is ${PROPERTY.address}.`, source: "Lease on file" };
  if (has(q, /who.*(landlord|owner)|(landlord|owner).*name|who owns/)) {
    return { known: true, answer: `Your owner is ${PROPERTY.owner}.`, source: "Lease on file" };
  }

  // The water heater, from the house record
  if (has(q, /water heater|hot water|\bheater\b/)) {
    const h = facts.heater;
    const fallback = EQUIPMENT[0];
    if (!h) {
      return {
        known: true,
        answer: `The home inspection lists a water heater from about ${fallback.installYear}, so it is roughly ${ageOf(fallback)} years old. The brand, model, and serial number are not on file yet. A photo of its label fills them in.`,
        source: fallback.source,
      };
    }
    if (has(q, /brand|make|manufactur|who made/)) return { known: true, answer: `It is a ${h.manufacturer}.`, source: h.source };
    if (has(q, /model/)) return { known: true, answer: `The model is ${h.model}.`, source: h.source };
    if (has(q, /serial/)) return { known: true, answer: `The serial number on file is ${h.serial}${h.unconfirmed.includes("serial") ? " (not confirmed yet)" : ""}.`, source: h.source };
    if (has(q, /gas|electric|fuel|propane/)) return { known: true, answer: `It runs on ${h.fuelType.toLowerCase()}.`, source: h.source };
    if (has(q, /gallon|size|capacity|big/)) return { known: true, answer: `It holds ${h.capacityGallons} gallons.`, source: h.source };
    if (has(q, /warrant/)) return dontKnow("the warranty terms for your water heater");
    return {
      known: true,
      answer: `It is a ${h.manufacturer} ${h.model}, ${h.capacityGallons} gallons, ${h.fuelType.toLowerCase()}, made ${monthYear(h.manufactureDate)}. That makes it about ${h.ageYears} ${h.ageYears === 1 ? "year" : "years"} old.`,
      source: h.source,
    };
  }

  // Other equipment, from the inspection and the record
  for (const w of EQUIPMENT_WORDS) {
    if (!w.re.test(q)) continue;
    const item = EQUIPMENT.find((e) => e.id === w.id);
    if (!item) break;
    if (has(q, /warrant/)) return dontKnow(`the warranty terms for the ${w.name}`);
    // The same record the My home page shows, as it was recorded at move-in.
    if (has(q, /brand|make|who made|model|serial/)) {
      const serial = has(q, /serial/) ? `, serial number ${item.serial.replace(/^lot\s*/i, "")}` : "";
      return { known: true, answer: `The ${w.name} is a ${item.brand} ${item.model}${serial}, as recorded at move-in.`, source: item.source };
    }
    if (has(q, /where|located|location|find/)) return { known: true, answer: `The ${w.name} is ${item.location.charAt(0).toLowerCase()}${item.location.slice(1)}.`, source: item.source };
    return {
      known: true,
      answer: `The ${w.name} was installed in ${item.installYear}, so it is about ${ageOf(item)} years old. A typical life is about ${item.typicalLifeYears} years (a placeholder number).`,
      source: item.source,
    };
  }

  return dontKnow("the answer to that");
}

const PROBLEM_WORDS =
  /\b(leak|leaks|leaking|broken|broke|not working|isn'?t working|won'?t|doesn'?t|stopped|clog|clogged|overflow|overflowing|flood|flooding|burst|smell|smells|smoke|spark|sparking|noise|noisy|drip|dripping|stuck|cracked|no heat|no power|no hot water|mold|mice|mouse|roach|roaches|pests?)\b/i;

/**
 * Is a tenant's text a repair problem or a question about the home? Problems always win,
 * so "why is my water heater leaking?" is a problem. Otherwise a question mark or a
 * question word means a question.
 */
export function classifyTenantText(text: string): "problem" | "question" {
  const t = text.trim();
  if (PROBLEM_WORDS.test(t)) return "problem";
  if (/\?\s*$/.test(t) || /^(how|when|what|where|who|why|can|could|may|do|does|is|are|will|am|did|which)\b/i.test(t)) return "question";
  return "problem";
}
