// The screens of the demo, grouped by who is using them.
//
//  tenant   : the person living in the home. Reports a problem, stays safe, follows progress.
//  owner    : the person who owns the home. Decides and approves spending.
//  tools    : owner "plan ahead" tools that are not part of one repair.
//  optional : owner side tool for older equipment, not part of the main flow.
//
// Porchlight itself plays the AI property manager in between.

export type FlowId = "live" | "tenant" | "owner" | "tools" | "optional";

export interface Step {
  id: string;
  flow: FlowId;
  path: string;
  short: string;
  title: string;
  /** One or two plain sentences, shown in "Why this screen exists" */
  why: string;
}

export interface FlowInfo {
  id: FlowId;
  label: string;
  blurb: string;
  /** Numbered flows show "Step 2 of 5" and a progress bar */
  numbered: boolean;
  /** Where Back goes from the first screen, and Next goes from the last */
  home: string;
  homeLabel: string;
}

export const FLOWS: Record<FlowId, FlowInfo> = {
  live: {
    id: "live",
    label: "Watch it work",
    blurb: "The agents running over text messages, side by side",
    numbered: false,
    home: "/",
    homeLabel: "Back to home",
  },
  tenant: {
    id: "tenant",
    label: "Tenant",
    blurb: "Reports a problem, stays safe, follows progress",
    numbered: true,
    home: "/",
    homeLabel: "Back to home",
  },
  owner: {
    id: "owner",
    label: "Owner",
    blurb: "Reviews the request, decides, and books",
    numbered: true,
    home: "/owner",
    homeLabel: "Back to owner home",
  },
  tools: {
    id: "tools",
    label: "Plan ahead",
    blurb: "Owner tools that are not part of one repair",
    numbered: false,
    home: "/owner",
    homeLabel: "Back to owner home",
  },
  optional: {
    id: "optional",
    label: "Optional",
    blurb: "For older equipment the record does not have",
    numbered: false,
    home: "/owner/record",
    homeLabel: "Back to the house record",
  },
};

export const STEPS: Step[] = [
  // ---- Live ----
  {
    id: "live-watch",
    flow: "live",
    path: "/live",
    short: "Live",
    title: "Watch Porchlight work",
    why: "This shows the whole idea in two minutes. A tenant texts at 4 AM, and Porchlight handles it while the owner sleeps. The owner only wakes up to one decision. The two phones show what each person sees at the same moment, and the log shows which parts the AI did and which parts plain code did.",
  },
  {
    id: "live-sms",
    flow: "live",
    path: "/sms",
    short: "SMS",
    title: "Live agent console",
    why: "Porchlight lives in text messages, so nobody has to log in. Type as the tenant, tap as the owner, or press Play and watch all three agents run: the 4 AM triage, the quote audit, and the rent compliance check. The log shows which parts the AI did, which parts plain code did, and where Porchlight waits for a tap.",
  },
  // ---- Tenant ----
  {
    id: "tenant-report",
    flow: "tenant",
    path: "/tenant/request",
    short: "Report",
    title: "Report a problem",
    why: "Tenants describe the problem in their own words and attach a photo. This replaces a long thread of texts and phone calls. The tenant does not choose or pay for the repair. The owner does.",
  },
  {
    id: "tenant-safety",
    flow: "tenant",
    path: "/tenant/safety",
    short: "Safety",
    title: "What to do right now",
    why: "While the owner decides what to do, the tenant needs to stay safe and limit the damage. Each step has simple instructions, so nobody has to search the web in a stressful moment.",
  },
  {
    id: "tenant-label",
    flow: "tenant",
    path: "/tenant/label",
    short: "Photo",
    title: "One quick photo",
    why: "Porchlight builds the house record from the label on the equipment, so the owner never has to hunt for paperwork. The tenant is only asked when the record is missing the details, and only once. If the label is hard to reach, they can skip it and the owner adds it instead.",
  },
  {
    id: "tenant-status",
    flow: "tenant",
    path: "/tenant/status",
    short: "Status",
    title: "Request status",
    why: "Tenants should never have to chase anyone to find out what is happening. This shows each stage, and asks the tenant to confirm the time the plumber can come.",
  },
  // ---- Owner repair flow ----
  {
    id: "owner-request",
    flow: "owner",
    path: "/owner/request",
    short: "Request",
    title: "Review the request",
    why: "Porchlight has already read the tenant's report and photo, sorted the urgency, and told the tenant what to do. The owner sees a clear summary and decides what happens next.",
  },
  {
    id: "owner-record",
    flow: "owner",
    path: "/owner/record",
    short: "Record",
    title: "House record",
    why: "Everything about the home in one place. The first label photo (from the tenant, or the owner) starts the record. After that, new equipment is recorded automatically by the installer, so nobody types serial numbers or hunts for paperwork.",
  },
  {
    id: "owner-quote",
    flow: "owner",
    path: "/owner/quote",
    short: "Quote",
    title: "Quote check",
    why: "Most small owners have no way to tell if a quote is fair. Porchlight collects quotes and checks each one against a typical price range with plain code. The owner can also paste a quote they got themselves.",
  },
  {
    id: "owner-decide",
    flow: "owner",
    path: "/owner/decide",
    short: "Decide",
    title: "Repair or replace",
    why: "A clear recommendation, with the rule shown so the owner can see why. The tool recommends and the owner decides.",
  },
  {
    id: "owner-book",
    flow: "owner",
    path: "/owner/book",
    short: "Book",
    title: "Approve and book",
    why: "The last step turns a decision into action. Porchlight already picked the best quote and set a spending limit. The owner taps once to approve, or picks a different vendor. When the job is done, the new equipment goes into the house record on its own.",
  },
  // ---- Plan ahead tools ----
  {
    id: "tools-forecast",
    flow: "tools",
    path: "/owner/forecast",
    short: "Forecast",
    title: "5-year forecast",
    why: "Big repairs should not be a surprise. This shows what is likely to wear out soon and how much to set aside each year.",
  },
  {
    id: "tools-rent",
    flow: "tools",
    path: "/owner/rent",
    short: "Rent",
    title: "Rent increase",
    why: "Rent rules in California are easy to get wrong. This checks the state cap and drafts the notice, so the owner starts from a safe place.",
  },
  // ---- Optional ----
  {
    id: "optional-label",
    flow: "optional",
    path: "/owner/label",
    short: "Label",
    title: "Add equipment details",
    why: "Most equipment is recorded automatically at install, or from a tenant's label photo. This is for adding an older item yourself, by photo or by typing, or for double checking a record that looks wrong.",
  },
];

export function stepById(id: string): Step {
  const step = STEPS.find((s) => s.id === id);
  if (!step) throw new Error(`Unknown step: ${id}`);
  return step;
}

export function stepForPath(pathname: string): Step | undefined {
  const clean = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  return STEPS.find((s) => s.path === clean);
}

export function flowSteps(flow: FlowId): Step[] {
  return STEPS.filter((s) => s.flow === flow);
}

/** Position inside the flow, starting at 1. */
export function positionOf(step: Step): { index: number; total: number } {
  const steps = flowSteps(step.flow);
  return { index: steps.findIndex((s) => s.id === step.id) + 1, total: steps.length };
}

/** The screen before and after this one, within its flow only. */
export function neighbors(step: Step): { prev?: Step; next?: Step } {
  const steps = flowSteps(step.flow);
  const i = steps.findIndex((s) => s.id === step.id);
  return { prev: steps[i - 1], next: steps[i + 1] };
}

/** A readable screen name for the feedback notes. */
export function screenNameFor(pathname: string): string {
  const step = stepForPath(pathname);
  if (step) {
    const flow = FLOWS[step.flow];
    if (flow.numbered) {
      const { index, total } = positionOf(step);
      return `${flow.label}, screen ${index} of ${total}: ${step.title}`;
    }
    return `${flow.label}: ${step.title}`;
  }
  if (pathname.startsWith("/feedback")) return "Feedback notes";
  if (pathname === "/owner") return "Owner home";
  if (pathname === "/") return "Home";
  if (pathname === "/pricing") return "Pricing";
  if (pathname === "/about") return "About and FAQ";
  if (pathname === "/sms" || pathname === "/live") return "Watch it work";
  // Any other path (a 404) is named the same on the server and the client, so the page hydrates cleanly.
  return "Another page";
}

/** Which side of the demo a path belongs to, for the header. */
export function roleForPath(pathname: string): "tenant" | "owner" | null {
  if (pathname.startsWith("/tenant")) return "tenant";
  if (pathname.startsWith("/owner")) return "owner";
  return null;
}
