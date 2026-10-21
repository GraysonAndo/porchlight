// Shared types for GoHome. The AIProvider interface at the bottom is the
// only thing the UI knows about "AI". Swap lib/mockAI.ts for a real Claude
// implementation later and no screen needs to change.

export type Role = "tenant" | "owner";
export type Urgency = "emergency" | "urgent" | "routine";
export type Verdict = "fair" | "slightly high" | "high" | "low";

export interface PriceRange {
  low: number;
  high: number;
}

export interface Photo {
  name: string;
  /** A path under /public, or a data URL. Empty if the photo was too large to keep. */
  src: string;
  isSample: boolean;
}

import type { World } from "./agents/types";

// ---------- AI inputs and outputs ----------

export interface TriageInput {
  description: string;
  photos: Photo[];
}

export interface TriageResult {
  category: string;
  urgency: Urgency;
  summary: string;
  likelyCause: string;
  safetySteps: string[];
  tenantQuestions: string[];
  suggestedTrade: string;
  /** 0 to 1 */
  confidence: number;
  /** True when the owner must be alerted right away, and fix steps are skipped or kept to safety only */
  alertOwnerNow?: boolean;
}

export interface LabelInput {
  photo: Photo | null;
}

export interface LabelResult {
  manufacturer: string;
  model: string;
  serial: string;
  capacityGallons: number;
  fuelType: string;
  /** ISO year and month, for example "2015-03" */
  manufactureDate: string;
  ageYears: number;
  /** 0 to 1 */
  confidence: number;
  /** Field keys the human should double check, for example ["serial"] */
  fieldsNeedingReview: string[];
}

export interface QuoteLine {
  id: string;
  label: string;
  amount: number;
}

export interface VendorQuote {
  vendorId: string;
  vendorName: string;
  total: number;
  lines: QuoteLine[];
}

/** The job being quoted, with its (placeholder) market ranges. */
export interface QuoteItem {
  name: string;
  marketTotal: PriceRange;
  /** Keyed by QuoteLine.id */
  marketLines: Record<string, PriceRange>;
}

export interface QuoteCheckInput {
  quote: VendorQuote;
  item: QuoteItem;
}

export interface QuoteCheckResult {
  verdict: Verdict;
  marketLow: number;
  marketHigh: number;
  flaggedLines: { line: string; reason: string }[];
  questionsToAsk: string[];
  estimatedSavingsLow: number;
  estimatedSavingsHigh: number;
}

export interface VendorMessageInput {
  ownerName: string;
  vendorName: string;
  address: string;
  jobDescription: string;
  quoteTotal: number;
  notToExceed: number;
  accessWindow: string;
  licenseShown: boolean;
  /** True when the quote already has a permit line, so the message does not ask about it */
  hasPermitLine?: boolean;
}

export interface TenantMessageInput {
  tenantName: string;
  ownerName: string;
  vendorName: string;
  address: string;
  accessWindow: string;
}

export interface AIProvider {
  triageRequest(input: TriageInput): Promise<TriageResult>;
  readLabel(input: LabelInput): Promise<LabelResult>;
  checkQuote(input: QuoteCheckInput): Promise<QuoteCheckResult>;
  draftVendorMessage(input: VendorMessageInput): Promise<string>;
  draftTenantMessage(input: TenantMessageInput): Promise<string>;
}

// ---------- App data ----------

export interface EquipmentItem {
  id: string;
  name: string;
  /** Where the record came from, for example an installer registration */
  source: string;
  brand: string;
  model: string;
  serial: string;
  /** Where in the home it is, for guides ("Garage, to the left of the garage door") */
  location: string;
  /** One plain line on what it is ("40 gallon, natural gas, tank type") */
  summary: string;
  installYear: number;
  typicalLifeYears: number;
  replaceLow: number;
  replaceHigh: number;
  /** A recurring chore for the owner, shown on the record, such as testing the alarms */
  reminder?: string;
}

export interface RepairRequest {
  description: string;
  photos: Photo[];
  submittedAt: string;
}

/** What gets saved to the house record from the label screen. */
export interface WaterHeaterRecord {
  manufacturer: string;
  model: string;
  serial: string;
  capacityGallons: number;
  fuelType: string;
  manufactureDate: string;
  ageYears: number;
  /** Field keys that were low confidence and the human has not confirmed yet */
  unconfirmed: string[];
  photo: Photo | null;
  /** Where we got these details, shown on the house record */
  source: string;
  /** True once the owner checked the details against a label photo */
  verified?: boolean;
}

export interface RentFormState {
  currentRent: number;
  cpiPercent: number;
  proposedRent: number;
  tenancy12Plus: boolean;
  increasesInLast12Months: number;
  /** Total percent the rent went up over the last 12 months. Only matters when an increase was already given. */
  priorIncreasePercent: number;
  singleFamilyOrCondo: boolean;
  notCorporateOwned: boolean;
  exemptionNoticeGiven: boolean;
  buildingUnder15Years: boolean;
}

export interface Approval {
  vendorId: string;
  notToExceed: number;
  accessWindow: string;
  sentAt: string;
}

export interface FeedbackNote {
  id: string;
  screen: string;
  rating: number;
  note: string;
  timestamp: string;
}

/** A payment the tenant made. Only the last four digits and a confirmation number are ever kept. */
export interface Payment {
  id: string;
  /** What it paid: "rent" or "utilities" */
  kind: "rent" | "utilities";
  label: string;
  /** Cents, not including the fee */
  cents: number;
  /** Card fee in cents (0 for a bank transfer) */
  feeCents: number;
  method: "card" | "bank";
  last4: string;
  paidAt: string;
  confirmation: string;
}

/** A correction the owner made to an item in the home record, for example a misread model number. */
export interface EquipmentEdit {
  brand?: string;
  model?: string;
  serial?: string;
  location?: string;
  /** The year it was installed or made. Drives its age, the forecast, and the repair or replace rule. */
  installYear?: number;
  /** One plain line on what it is, such as "40 gallon, natural gas, tank type" */
  summary?: string;
}

/** A rent notice the owner sent. Nothing is really mailed. */
export interface RentNoticeSent {
  kind: "increase" | "decrease";
  from: number;
  to: number;
  /** ISO date the new rent starts */
  effective: string;
  sentAt: string;
}

/** Settings for each side. */
export interface Prefs {
  tenantEmail: boolean;
  tenantAutopay: boolean;
  /** A payment method set up for autopay before any manual payment, such as "bank account ending in 6789" */
  tenantAutopayMethod: string | null;
  ownerEmail: boolean;
  ownerEmergencyCalls: boolean;
  /** The numbers GoHome texts and calls. Each person can correct their own. */
  ownerPhone: string;
  tenantPhone: string;
  /** GoHome books a repair on its own when the quote is at or under this many dollars. 0 means it always asks. */
  ownerAutoApprove: number;
}

export interface DemoState {
  role: Role | null;
  request: RepairRequest | null;
  triage: TriageResult | null;
  /** The owner's label check of the heater, if they did one. Otherwise the seeded record is used. */
  houseRecord: WaterHeaterRecord | null;
  quoteCheck: QuoteCheckResult | null;
  rent: RentFormState;
  approval: Approval | null;
  /** The tenant's answers to the follow-up questions, or null if not sent yet */
  tenantAnswers: string[] | null;
  /** Whether the tenant confirmed the visit window */
  tenantAccess: "confirmed" | "needs-change" | null;
  /** When the plumber finished the job (simulated), which adds the new heater to the record */
  jobCompletedAt: string | null;
  /** When rent for the current month was marked paid (demo only, nothing is charged), or null */
  rentPaidAt: string | null;
  /** Payments the tenant made, newest last */
  payments: Payment[];
  prefs: Prefs;
  /** The rent notice the owner sent from the rent page, or null */
  rentNotice: RentNoticeSent | null;
  /** Every rent notice sent, oldest first, so the owner keeps a record of what went out and when */
  rentNoticeLog: RentNoticeSent[];
  /** Corrections the owner made to the home record, by equipment id */
  equipmentEdits: Record<string, EquipmentEdit>;
  /** The step each how-to guide was last on, so a reload or a call mid-guide picks up where the tenant left off */
  guideProgress: Record<string, number>;
  /** Equipment the owner added by photographing its data plate, so the record, guides, and forecast include it */
  extraEquipment: EquipmentItem[];
  /** GoHome's agent: every text, tool call, and record write, shared by the tenant and owner screens */
  agent: World;
  /** Whether each person gets GoHome's updates by text */
  textUpdates: { tenant: boolean; owner: boolean };
  /** Which pricing tier the visitor said they would pick, for the pricing test */
  pricingPick: "starter" | "plus" | "pro" | "none" | null;
  feedback: FeedbackNote[];
}
