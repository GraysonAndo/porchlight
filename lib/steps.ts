// The 9 screens of the demo, in order. Used by the stepper, demo guide,
// Back and Next controls, and the feedback sheet.

export interface Step {
  n: number;
  path: string;
  short: string;
  title: string;
  /** One or two plain sentences, shown in "Why this screen exists" */
  why: string;
}

export const STEPS: Step[] = [
  {
    n: 1,
    path: "/tenant/request",
    short: "Report",
    title: "Report a repair",
    why: "Tenants describe the problem in their own words and attach a photo. This replaces a long thread of texts and phone calls.",
  },
  {
    n: 2,
    path: "/triage",
    short: "Triage",
    title: "AI triage",
    why: "Owners should not have to guess how serious a problem is. Triage sorts it by urgency and gives the tenant safe next steps right away.",
  },
  {
    n: 3,
    path: "/label",
    short: "Label",
    title: "Read the equipment label",
    why: "Model, serial number, and age are the facts that decide repair or replace. Taking a photo of the label is faster than typing them in.",
  },
  {
    n: 4,
    path: "/record",
    short: "Record",
    title: "House record",
    why: "One place for what is in the house and how old it is. Later answers, like the forecast, are built on this.",
  },
  {
    n: 5,
    path: "/quote",
    short: "Quote",
    title: "Quote check",
    why: "Most small owners have no way to tell if a quote is fair. This compares it to a typical price range and lists what to ask the vendor.",
  },
  {
    n: 6,
    path: "/decide",
    short: "Decide",
    title: "Repair or replace",
    why: "A clear recommendation, with the rule shown so the owner can see why. The tool recommends and the owner decides.",
  },
  {
    n: 7,
    path: "/forecast",
    short: "Forecast",
    title: "5-year forecast",
    why: "Big repairs should not be a surprise. This shows what is likely to wear out soon and how much to set aside each year.",
  },
  {
    n: 8,
    path: "/rent",
    short: "Rent",
    title: "Rent increase",
    why: "Rent rules in California are easy to get wrong. This checks the state cap and drafts the notice, so the owner starts from a safe place.",
  },
  {
    n: 9,
    path: "/approve",
    short: "Book",
    title: "Approve and book",
    why: "The last step turns a decision into action: pick a vendor, set a spending limit, and notify the vendor and the tenant.",
  },
];

export function stepForPath(pathname: string): Step | undefined {
  const clean = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  return STEPS.find((s) => s.path === clean);
}

/** A readable screen name for the feedback notes. */
export function screenNameFor(pathname: string): string {
  const step = stepForPath(pathname);
  if (step) return `Screen ${step.n} of ${STEPS.length}: ${step.title}`;
  if (pathname.startsWith("/feedback")) return "Feedback notes";
  if (pathname === "/") return "Home";
  return pathname;
}
