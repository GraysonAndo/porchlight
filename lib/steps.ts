// The screens of GoHome, grouped by who is using them. A tenant only ever sees tenant screens, and an owner
// only ever sees owner screens. If something is not relevant to a person, it is not on their side.
//
//  tenant : the person living in the home. Chat with GoHome, see what is in their home, follow how-to guides.
//  owner  : the person who owns the home. Approves repairs and spending, and plans ahead.

export type Role = "tenant" | "owner";

export interface NavItem {
  href: string;
  label: string;
  /** Pages under this path also count as "here" in the nav */
  match?: string[];
}

export const TENANT_NAV: NavItem[] = [
  { href: "/tenant", label: "Help" },
  { href: "/tenant/home", label: "My home", match: ["/tenant/guides"] },
  { href: "/tenant/pay", label: "Pay" },
];

export const OWNER_NAV: NavItem[] = [
  { href: "/owner", label: "Inbox", match: ["/owner/request", "/owner/quote", "/owner/decide", "/owner/book"] },
  { href: "/owner/record", label: "Home record" },
  { href: "/owner/forecast", label: "Forecast" },
  { href: "/owner/rent", label: "Rent" },
];

/** The pages that make up one repair, shown as tabs on the repair detail screens (owner only). */
export const REPAIR_TABS: NavItem[] = [
  { href: "/owner/request", label: "Request" },
  { href: "/owner/decide", label: "Decision" },
  { href: "/owner/quote", label: "Quotes" },
  { href: "/owner/book", label: "Booking" },
];

export const PAGE_TITLES: Record<string, string> = {
  "/": "Welcome",
  "/tenant": "Help",
  "/tenant/home": "My home",
  "/tenant/pay": "Pay rent and utilities",
  "/tenant/settings": "Settings",
  "/tenant/texts": "By text",
  "/owner/settings": "Settings",
  "/owner": "Inbox",
  "/owner/request": "Repair request",
  "/owner/quote": "Quotes",
  "/owner/decide": "Repair or replace",
  "/owner/book": "Booking",
  "/owner/record": "Home record",
  "/owner/forecast": "5-year forecast",
  "/owner/rent": "Rent change",
  "/pricing": "Pricing",
  "/about": "About",
  "/feedback": "Feedback notes",
};

/** One sentence per page for search results and link previews. Sample data only, so none of it promises a real service. */
export const PAGE_DESCRIPTIONS: Record<string, string> = {
  "/": "GoHome is a clickable prototype of an AI property manager for owners of 1 to 10 rentals in California. Tenants get step-by-step help. Owners tap Approve.",
  "/tenant": "Tell GoHome what is wrong. It knows your exact equipment, gives picture steps, and tells your owner only when it has to.",
  "/tenant/home": "Everything in your rental in one place: equipment, picture guides, your lease basics, and what you owe.",
  "/tenant/pay": "Pay the sample rent and utilities. Nothing is really charged.",
  "/tenant/settings": "Choose how GoHome contacts you. Sample settings, nothing is really sent.",
  "/tenant/texts": "See how GoHome works by text message in the full product. Sample messages only.",
  "/owner": "Your approval inbox. GoHome gathers quotes, checks prices, and sets a limit. You tap Approve.",
  "/owner/request": "A repair request as the owner sees it, with the photo, the triage, and what GoHome did next.",
  "/owner/quote": "Compare sample vendor quotes line by line against a placeholder price range.",
  "/owner/decide": "A repair or replace decision with the cost and age behind it. Sample numbers.",
  "/owner/book": "Book the plumber and see the job added to your home record. Sample data.",
  "/owner/record": "A record of every item in the rental with brand, model, serial, age, and where it is.",
  "/owner/forecast": "A 5-year forecast of what is likely to need replacing and what to set aside. Placeholder estimates.",
  "/owner/rent": "Check a California rent increase against the AB 1482 cap and draft a notice. Draft, not legal advice.",
  "/owner/settings": "Choose how GoHome contacts you and how much it may approve on its own. Sample settings.",
  "/pricing": "Three sample price tiers per unit per month. Illustrative placeholders, not a real offer.",
  "/about": "What GoHome is, who built it, answers to common questions, and how to get in touch.",
  "/feedback": "Notes saved from the Send feedback link. They stay in this browser.",
};

/** A readable screen name for the feedback notes. */
export function screenNameFor(pathname: string): string {
  const clean = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  const title = PAGE_TITLES[clean];
  if (title) {
    const role = roleForPath(clean);
    return role ? `${role === "owner" ? "Owner" : "Tenant"}: ${title}` : title;
  }
  if (clean.startsWith("/tenant/guides/")) return "Tenant: How-to guide";
  // Any other path (a 404) is named the same on the server and the client, so the page hydrates cleanly.
  return "Another page";
}

/** Which side a path belongs to, for the header. */
export function roleForPath(pathname: string): Role | null {
  if (pathname.startsWith("/tenant")) return "tenant";
  if (pathname.startsWith("/owner")) return "owner";
  return null;
}

export function isActive(pathname: string, item: NavItem): boolean {
  const clean = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  if (clean === item.href) return true;
  return (item.match ?? []).some((m) => clean === m || clean.startsWith(`${m}/`));
}
