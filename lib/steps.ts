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
  { href: "/owner/quote", label: "Quotes" },
  { href: "/owner/decide", label: "Decision" },
  { href: "/owner/book", label: "Booking" },
];

export const PAGE_TITLES: Record<string, string> = {
  "/": "Welcome",
  "/tenant": "Help",
  "/tenant/home": "My home",
  "/tenant/pay": "Pay rent and utilities",
  "/tenant/settings": "Settings",
  "/owner/settings": "Settings",
  "/owner": "Inbox",
  "/owner/request": "Repair request",
  "/owner/quote": "Quotes",
  "/owner/decide": "Repair or replace",
  "/owner/book": "Booking",
  "/owner/record": "Home record",
  "/owner/forecast": "5-year forecast",
  "/owner/rent": "Rent increase",
  "/pricing": "Pricing",
  "/about": "About and FAQ",
  "/feedback": "Feedback notes",
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
