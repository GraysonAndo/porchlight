// All sample data lives here. Everything is fictional.
// Numbers marked "placeholder" are NOT market data. See README, "Placeholder numbers".

import { createWorld } from "./agents/world";
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
  ownerPhone: "(555) 010-0100",
  ownerAddress: "PO Box 100, San Jose, CA 95100",
  tenantEmail: "sample.tenant@example.com",
  rent: 3200,
  tenantSince: 2023,
  /** Sample lease terms for late rent */
  lateFee: 50,
  graceDays: 3,
};

/** The month the sample rent payment is for. */
export const RENT_MONTH = "October 2026";

export const SEED_REQUEST_TEXT =
  "The water heater is leaking from the bottom and the floor in the garage is wet.";

export const SAMPLE_PHOTO_PATH = "/sample/leaking-heater.svg";

export const SAMPLE_PHOTO: Photo = { name: "leaking-heater.svg", src: SAMPLE_PHOTO_PATH, isSample: true };

/** Used by screens that are opened directly, before anyone submitted a request. */
export const SEED_REQUEST = { description: SEED_REQUEST_TEXT, photos: [SAMPLE_PHOTO] };

/** Equipment for the forecast. Typical life and replace cost are placeholders. */
export const EQUIPMENT: EquipmentItem[] = [
  { id: "water-heater", name: "Water heater", source: "Recorded at move-in from the data plate and the home inspection", brand: "Hearthline", model: "HL-40G-NG", serial: "15C0412-X", location: "Garage, to the left of the garage door", summary: "40 gallon, natural gas, tank type", installYear: 2015, typicalLifeYears: 10, replaceLow: 1600, replaceHigh: 2600 },
  { id: "furnace", source: "Recorded at move-in from the data plate", name: "Furnace", brand: "Cedarline", model: "CF-80-100", serial: "12F3391-B", location: "Hall closet", summary: "Gas forced air, 100,000 BTU", installYear: 2012, typicalLifeYears: 18, replaceLow: 4500, replaceHigh: 7000 },
  { id: "air-conditioner", source: "Recorded at move-in from the data plate", name: "Air conditioner", brand: "Cedarline", model: "CA-3T-14", serial: "12A7710-C", location: "Side yard, next to the gate", summary: "3 ton, 14 SEER, outdoor unit", installYear: 2012, typicalLifeYears: 15, replaceLow: 5500, replaceHigh: 8500 },
  { id: "dishwasher", source: "Installer warranty registration", name: "Dishwasher", brand: "Brightwell", model: "BW-DW24", serial: "18D2204-F", location: "Kitchen, left of the sink", summary: "24 inch built-in", installYear: 2018, typicalLifeYears: 10, replaceLow: 700, replaceHigh: 1200 },
  { id: "refrigerator", source: "Added by the owner", name: "Refrigerator", brand: "Frostmere", model: "FM-21T", serial: "16R0953-K", location: "Kitchen", summary: "21 cubic feet, top freezer", installYear: 2016, typicalLifeYears: 14, replaceLow: 1100, replaceHigh: 1900 },
  { id: "smoke-co", source: "Move-in safety check", name: "Smoke and CO detectors", brand: "Safelight", model: "SL-10Y-COMBO", serial: "Lot 19-4410", location: "Hallway, each bedroom, and the kitchen", summary: "Hardwired smoke and carbon monoxide alarms, 10 year", installYear: 2019, typicalLifeYears: 10, replaceLow: 150, replaceHigh: 400, reminder: "California requires working smoke and carbon monoxide alarms. Test them on the 1st of each month, and change the backup batteries once a year." },
  { id: "roof", source: "Home inspection report", name: "Roof", brand: "Ridgecrest", model: "RC-30 Architectural", serial: "Lot 09-2231", location: "Whole house", summary: "Asphalt shingle, 30 year rating", installYear: 2009, typicalLifeYears: 25, replaceLow: 9000, replaceHigh: 15000 },
];

export const WATER_HEATER = EQUIPMENT[0];

/** The heater in the home at the start: recorded at move-in, so nothing has to be looked up or photographed. */
export const OLD_HEATER_RECORD: WaterHeaterRecord = {
  manufacturer: "Hearthline",
  model: "HL-40G-NG",
  serial: "15C0412-X",
  capacityGallons: 40,
  fuelType: "Natural gas",
  manufactureDate: "2015-03",
  ageYears: 11,
  unconfirmed: [],
  photo: null,
  source: "Recorded at move-in from the data plate and the home inspection",
};

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
  source: "Added automatically by the installer when the job was finished",
};

/** The job we are quoting, with placeholder market ranges (total and per line). */
export const WATER_HEATER_JOB: QuoteItem = {
  name: "40 gallon gas tank water heater swap",
  marketTotal: { low: 1600, high: 2600 },
  // The line ranges add up to the total range ($1,600 to $2,600), so the total never contradicts its lines.
  marketLines: {
    unit: { low: 555, high: 830 },
    labor: { low: 620, high: 1030 },
    permit: { low: 100, high: 150 },
    haul: { low: 50, high: 120 },
    expansion: { low: 150, high: 250 },
    fittings: { low: 100, high: 180 },
    seismic: { low: 25, high: 40 },
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
    { id: "unit", label: "Unit", amount: 790 },
    { id: "labor", label: "Labor", amount: 1020 },
    { id: "permit", label: "Permit", amount: 150 },
    { id: "haul", label: "Haul away", amount: 100 },
    { id: "expansion", label: "Expansion tank", amount: 230 },
    { id: "fittings", label: "Gas flex line and misc fittings", amount: 130 },
    { id: "seismic", label: "Seismic strapping kit", amount: 30 },
  ],
};

/** A1 did not list a permit line, and did not show a license number. */
export const A1_QUOTE: VendorQuote = {
  vendorId: "a1-rapid",
  vendorName: "A1 Rapid Plumbing",
  total: 2100,
  lines: [
    { id: "unit", label: "Unit", amount: 700 },
    { id: "labor", label: "Labor", amount: 890 },
    { id: "haul", label: "Haul away", amount: 100 },
    { id: "expansion", label: "Expansion tank", amount: 200 },
    { id: "fittings", label: "Gas flex line and misc fittings", amount: 170 },
    { id: "seismic", label: "Seismic strapping kit", amount: 40 },
  ],
};

/** The three quotes GoHome collected from vendors. */
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
    license: "CSLB #000000",
    warning: null,
    itemized: true,
  },
  {
    id: "willow-glen",
    name: "Willow Glen Water Heater Co.",
    total: 2450,
    license: "CSLB #000000",
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
  priorIncreasePercent: 0,
  singleFamilyOrCondo: true,
  notCorporateOwned: true,
  exemptionNoticeGiven: false,
  buildingUnder15Years: false,
};

export const INITIAL_STATE: DemoState = {
  role: null,
  request: null,
  triage: null,
  houseRecord: OLD_HEATER_RECORD,
  quoteCheck: null,
  rent: DEFAULT_RENT_FORM,
  approval: null,
  tenantAnswers: null,
  tenantAccess: null,
  jobCompletedAt: null,
  rentPaidAt: null,
  payments: [],
  rentNotice: null,
  rentNoticeLog: [],
  equipmentEdits: {},
  guideProgress: {},
  extraEquipment: [],
  prefs: { tenantEmail: true, tenantAutopay: false, tenantAutopayMethod: null, ownerEmail: true, ownerEmergencyCalls: true, ownerPhone: PROPERTY.ownerPhone, tenantPhone: PROPERTY.tenantPhone, ownerAutoApprove: 0 },
  agent: createWorld(),
  textUpdates: { tenant: true, owner: true },
  pricingPick: null,
  feedback: [],
};
