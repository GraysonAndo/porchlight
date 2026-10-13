// All demo data lives here. Everything is fictional.
// Numbers marked "placeholder" are NOT market data. See README, "Placeholder numbers".

import type {
  DemoState,
  EquipmentItem,
  Photo,
  QuoteItem,
  RentFormState,
  VendorQuote,
  WaterHeaterRecord,
} from "./types";

export const PLACEHOLDER_LABEL = "Illustrative placeholder, not market data";

export const PROPERTY = {
  address: "1200 Example Court, San Jose, CA 95100",
  kind: "Single family rental",
  units: 1,
  unitLabel: "Main house",
  owner: "Sample Owner",
  tenant: "Sample Tenant",
  tenantPhone: "(555) 010-0142",
  tenantEmail: "sample.tenant@example.com",
  rent: 3200,
  tenantSince: 2023,
};

export const SEED_REQUEST_TEXT =
  "The water heater is leaking from the bottom and the floor in the garage is wet.";

export const SAMPLE_PHOTO_PATH = "/sample/leaking-heater.svg";
export const SAMPLE_LABEL_PATH = "/sample/equipment-label.svg";

export const SAMPLE_PHOTO: Photo = { name: "leaking-heater.svg", src: SAMPLE_PHOTO_PATH, isSample: true };
export const SAMPLE_LABEL_PHOTO: Photo = { name: "equipment-label.svg", src: SAMPLE_LABEL_PATH, isSample: true };

/** Used by screens that are opened directly, before anyone submitted a request. */
export const SEED_REQUEST = { description: SEED_REQUEST_TEXT, photos: [SAMPLE_PHOTO] };

/** Equipment for the forecast. Typical life and replace cost are placeholders. */
export const EQUIPMENT: EquipmentItem[] = [
  { id: "water-heater", name: "Water heater", source: "Home inspection report (brand, model, and serial were not recorded)", installYear: 2015, typicalLifeYears: 10, replaceLow: 1600, replaceHigh: 2600 },
  { id: "furnace", source: "Home inspection report", name: "Furnace", installYear: 2012, typicalLifeYears: 18, replaceLow: 4500, replaceHigh: 7000 },
  { id: "air-conditioner", source: "Home inspection report", name: "Air conditioner", installYear: 2012, typicalLifeYears: 15, replaceLow: 5500, replaceHigh: 8500 },
  { id: "dishwasher", source: "Installer warranty registration", name: "Dishwasher", installYear: 2018, typicalLifeYears: 10, replaceLow: 700, replaceHigh: 1200 },
  { id: "refrigerator", source: "Added by owner", name: "Refrigerator", installYear: 2016, typicalLifeYears: 14, replaceLow: 1100, replaceHigh: 1900 },
  { id: "roof", source: "Home inspection report", name: "Roof", installYear: 2009, typicalLifeYears: 25, replaceLow: 9000, replaceHigh: 15000 },
];

export const WATER_HEATER = EQUIPMENT[0];

/** The replacement heater, added to the record automatically when the plumber finishes. */
export const NEW_HEATER_RECORD: WaterHeaterRecord = {
  manufacturer: "Hearthline",
  model: "HL-40G-NG",
  serial: "26J0007-A",
  capacityGallons: 40,
  fuelType: "Natural gas",
  manufactureDate: "2026-09",
  ageYears: 0,
  unconfirmed: [],
  photo: null,
  source: "Added automatically by the installer when the job was finished (sample)",
};

/** The job we are quoting, with placeholder market ranges (total and per line). */
export const WATER_HEATER_JOB: QuoteItem = {
  name: "40 gallon gas tank water heater swap",
  marketTotal: { low: 1600, high: 2600 },
  marketLines: {
    unit: { low: 600, high: 1000 },
    labor: { low: 700, high: 1100 },
    permit: { low: 100, high: 250 },
    haul: { low: 50, high: 150 },
    expansion: { low: 150, high: 300 },
    fittings: { low: 100, high: 250 },
    seismic: { low: 25, high: 75 },
  },
};

export const BAYSIDE_QUOTE: VendorQuote = {
  vendorId: "bayside",
  vendorName: "Bayside Plumbing and Heating",
  total: 2850,
  lines: [
    { id: "unit", label: "Unit", amount: 780 },
    { id: "labor", label: "Labor", amount: 1330 },
    { id: "permit", label: "Permit", amount: 150 },
    { id: "haul", label: "Haul away", amount: 120 },
    { id: "expansion", label: "Expansion tank", amount: 250 },
    { id: "fittings", label: "Gas flex line and misc fittings", amount: 180 },
    { id: "seismic", label: "Seismic strapping kit", amount: 40 },
  ],
};

export const WILLOW_QUOTE: VendorQuote = {
  vendorId: "willow-glen",
  vendorName: "Willow Glen Water Heater Co.",
  total: 2450,
  lines: [
    { id: "unit", label: "Unit", amount: 760 },
    { id: "labor", label: "Labor", amount: 1050 },
    { id: "permit", label: "Permit", amount: 150 },
    { id: "haul", label: "Haul away", amount: 100 },
    { id: "expansion", label: "Expansion tank", amount: 230 },
    { id: "fittings", label: "Gas flex line and misc fittings", amount: 120 },
    { id: "seismic", label: "Seismic strapping kit", amount: 40 },
  ],
};

/** A1 did not list a permit line, and did not show a license number. */
export const A1_QUOTE: VendorQuote = {
  vendorId: "a1-rapid",
  vendorName: "A1 Rapid Plumbing",
  total: 2100,
  lines: [
    { id: "unit", label: "Unit", amount: 700 },
    { id: "labor", label: "Labor", amount: 850 },
    { id: "haul", label: "Haul away", amount: 100 },
    { id: "expansion", label: "Expansion tank", amount: 200 },
    { id: "fittings", label: "Gas flex line and misc fittings", amount: 200 },
    { id: "seismic", label: "Seismic strapping kit", amount: 50 },
  ],
};

/** The three quotes Porchlight collected from vendors. */
export const QUOTES: VendorQuote[] = [BAYSIDE_QUOTE, WILLOW_QUOTE, A1_QUOTE];

export interface Vendor {
  id: string;
  name: string;
  total: number;
  /** null means the vendor did not show a license number */
  license: string | null;
  warning: string | null;
  itemized: boolean;
}

export const VENDORS: Vendor[] = [
  {
    id: "bayside",
    name: "Bayside Plumbing and Heating",
    total: 2850,
    license: "CSLB #000000 (sample)",
    warning: null,
    itemized: true,
  },
  {
    id: "willow-glen",
    name: "Willow Glen Water Heater Co.",
    total: 2450,
    license: "CSLB #000000 (sample)",
    warning: null,
    itemized: true,
  },
  {
    id: "a1-rapid",
    name: "A1 Rapid Plumbing",
    total: 2100,
    license: null,
    warning: "License number not shown. Ask before booking.",
    itemized: true,
  },
];

/** What the mock AI reads from the sample label photo. */
export const SAMPLE_LABEL_READING = {
  manufacturer: "Hearthline",
  model: "HL-40G-NG",
  serial: "15C0412-X",
  capacityGallons: 40,
  fuelType: "Natural gas",
  manufactureDate: "2015-03",
  ageYears: 11,
  confidence: 0.86,
  fieldsNeedingReview: ["serial"],
};

/** Placeholder repair estimate for the repair vs replace screen. */
export const REPAIR_ESTIMATE = 450;

export const ACCESS_WINDOWS = [
  "Tomorrow, 9:00 to 11:00 AM",
  "Tomorrow, 1:00 to 3:00 PM",
  "In 2 days, 9:00 to 11:00 AM",
  "In 2 days, 1:00 to 3:00 PM",
];

export const DEFAULT_RENT_FORM: RentFormState = {
  currentRent: PROPERTY.rent,
  cpiPercent: 3.0,
  proposedRent: 3360,
  tenancy12Plus: true,
  increasesInLast12Months: 0,
  singleFamilyOrCondo: true,
  notCorporateOwned: true,
  exemptionNoticeGiven: false,
  buildingUnder15Years: false,
};

export const INITIAL_STATE: DemoState = {
  role: null,
  request: null,
  triage: null,
  houseRecord: null,
  quoteCheck: null,
  rent: DEFAULT_RENT_FORM,
  approval: null,
  tenantAnswers: null,
  tenantAccess: null,
  jobCompletedAt: null,
  tenantSkippedLabel: false,
  feedback: [],
};
