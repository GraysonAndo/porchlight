// Phone-style checks in an emulated browser: a small iPhone SE sized screen, a landscape phone, text zoomed to 200%,
// and real touch taps (not mouse clicks) through the first tenant steps.
//
// This is emulation in Chromium. It is NOT iOS Safari and NOT a real phone. Test on a real device too.
//
// Usage: BASE_URL=http://localhost:3000 node scripts/phone.mjs

import { BASE, launch } from "./browser.mjs";

const ROUTES = ["/", "/about", "/pricing", "/tenant", "/tenant/home", "/tenant/pay", "/tenant/settings", "/owner", "/owner/quote", "/owner/decide", "/owner/record", "/owner/forecast", "/owner/rent", "/owner/settings"];
const MODES = [
  { name: "small phone 320x568", viewport: { width: 320, height: 568 }, zoom: 1 },
  { name: "landscape phone 844x390", viewport: { width: 844, height: 390 }, zoom: 1 },
  { name: "phone with 200% text", viewport: { width: 390, height: 844 }, zoom: 2 },
];

let failures = 0;
const fail = (m) => {
  failures++;
  console.log(`FAIL ${m}`);
};

const browser = await launch();
for (const mode of MODES) {
  const ctx = await browser.newContext({ viewport: mode.viewport, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/?reset=1`);
  await page.waitForFunction(() => !window.location.search.includes("reset=1"));
  for (const route of ROUTES) {
    await page.goto(`${BASE}${route}`);
    await page.waitForLoadState("networkidle");
    if (mode.zoom !== 1) await page.addStyleTag({ content: `html { font-size: ${mode.zoom * 100}% !important; }` });
    await page.waitForTimeout(300);
    const over = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
    if (over.sw > over.iw + 1) fail(`[${mode.name}] ${route}: horizontal scroll ${over.sw} > ${over.iw}`);
    // Text must not be cut off inside its own box (a button or heading that clips its words).
    const clipped = await page.evaluate(() => {
      const bad = [];
      for (const el of document.querySelectorAll("button, a.btn, h1, h2, h3, label")) {
        const s = getComputedStyle(el);
        if (s.display === "none" || el.getBoundingClientRect().width === 0 || el.closest(".sr-only")) continue;
        if ((s.overflow === "hidden" || s.overflowX === "hidden") && el.scrollWidth > el.clientWidth + 2) bad.push((el.textContent || "").trim().slice(0, 30));
      }
      return bad.slice(0, 3);
    });
    if (clipped.length) fail(`[${mode.name}] ${route}: clipped text in ${clipped.join(" | ")}`);
  }
  await ctx.close();
}

// Real touch taps through the start of the tenant journey, on a normal phone.
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 3 });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/?reset=1`);
  await page.waitForFunction(() => !window.location.search.includes("reset=1"));
  await page.goto(`${BASE}/`);
  await page.getByRole("button", { name: /Tenant/ }).tap();
  await page.waitForURL("**/tenant");
  await page.getByRole("button", { name: "My water heater is leaking" }).tap();
  try {
    await page.getByText(/near an outlet/).waitFor({ timeout: 20000 });
    await page.getByRole("button", { name: /^No$/ }).tap();
    await page.getByRole("button", { name: "Show me how" }).first().waitFor({ timeout: 20000 });
    await page.getByRole("button", { name: "Show me how" }).first().tap();
    await page.locator("dialog[open]").getByText(/Step 1 of/).waitFor({ timeout: 5000 });
  } catch (e) {
    fail(`touch journey stopped: ${String(e.message).split("\n")[0]}`);
  }
  await ctx.close();
}
await browser.close();
console.log(failures === 0 ? "\nPHONE: PASS (emulated, not a real device)" : `\nPHONE: ${failures} problem${failures === 1 ? "" : "s"}`);
process.exit(failures === 0 ? 0 : 1);
