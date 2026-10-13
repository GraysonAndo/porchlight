// Shared types for Porchlight. The AIProvider interface at the bottom is the
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
  installYear: number;
  typicalLifeYears: number;
  replaceLow: number;
  replaceHigh: number;
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
}

export interface RentFormState {
  currentRent: number;
  cpiPercent: number;
  proposedRent: number;
  tenancy12Plus: boolean;
  increasesInLast12Months: number;
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

export interface DemoState {
  role: Role | null;
  request: RepairRequest | null;
  triage: TriageResult | null;
  houseRecord: WaterHeaterRecord | null;
  quoteCheck: QuoteCheckResult | null;
  rent: RentFormState;
  approval: Approval | null;
  feedback: FeedbackNote[];
}
