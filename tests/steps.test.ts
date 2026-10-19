import { describe, expect, it } from "vitest";
import { OWNER_NAV, REPAIR_TABS, TENANT_NAV, isActive, roleForPath, screenNameFor } from "../lib/steps";

describe("navigation", () => {
  it("keeps tenants and owners on their own sides", () => {
    for (const item of TENANT_NAV) expect(item.href.startsWith("/tenant")).toBe(true);
    for (const item of [...OWNER_NAV, ...REPAIR_TABS]) expect(item.href.startsWith("/owner")).toBe(true);
  });

  it("gives the tenant only things a tenant needs: help, their home, and paying", () => {
    expect(TENANT_NAV.map((n) => n.label)).toEqual(["Help", "My home", "Pay"]);
  });

  it("does not show owner decisions to tenants", () => {
    const tenant = TENANT_NAV.map((n) => `${n.label} ${n.href}`.toLowerCase()).join(" ");
    for (const word of ["quote", "forecast", "rent increase", "decide", "decision", "book", "record", "label"]) {
      expect(tenant).not.toContain(word);
    }
  });

  it("puts the forecast and the rent increase tool on the owner side only", () => {
    const owner = OWNER_NAV.map((n) => n.href);
    expect(owner).toContain("/owner/forecast");
    expect(owner).toContain("/owner/rent");
    expect(TENANT_NAV.some((n) => /forecast|rent/.test(n.href))).toBe(false);
  });

  it("marks the repair detail pages as part of the owner inbox", () => {
    const inbox = OWNER_NAV[0];
    for (const tab of REPAIR_TABS) expect(isActive(tab.href, inbox)).toBe(true);
    expect(isActive("/owner/forecast", inbox)).toBe(false);
  });

  it("marks the guides as part of the tenant's home", () => {
    expect(isActive("/tenant/guides/heater-water-off", TENANT_NAV[1])).toBe(true);
    expect(isActive("/tenant", TENANT_NAV[1])).toBe(false);
  });

  it("names each side from the path", () => {
    expect(roleForPath("/tenant/home")).toBe("tenant");
    expect(roleForPath("/owner/quote")).toBe("owner");
    expect(roleForPath("/")).toBeNull();
    expect(roleForPath("/pricing")).toBeNull();
  });

  it("gives readable screen names for feedback, and one name for unknown pages", () => {
    expect(screenNameFor("/owner/quote")).toBe("Owner: Quotes");
    expect(screenNameFor("/tenant")).toBe("Tenant: Help");
    expect(screenNameFor("/tenant/guides/toilet-overflow")).toBe("Tenant: How-to guide");
    expect(screenNameFor("/")).toBe("Welcome");
    expect(screenNameFor("/nope")).toBe("Another page");
  });
});
