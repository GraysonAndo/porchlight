// Clicks every control on every page, at a phone width and a desktop width, in two states (a fresh start, and in the middle
// of a repair), and reports what looks wrong: links that lead nowhere or to an error, buttons that do nothing when pressed,
// console errors, uncaught exceptions, and text that shows a broken value.
//
// A button that changes nothing on the page, opens nothing, goes nowhere and downloads nothing is reported as "no visible effect".
// A few buttons are meant to do little (they only save a setting that has no visible change), so read the list, do not trust it blindly.
//
// Usage: BASE_URL=http://localhost:3000 node scripts/crawl.mjs

import { launch, BASE } from "./browser.mjs";

const ROUTES = [
  "/", "/about", "/pricing", "/feedback",
  "/tenant", "/tenant/home", "/tenant/pay", "/tenant/settings", "/tenant/texts", "/tenant/guides/heater-water-off", "/tenant/guides/breaker-reset",
  "/owner", "/owner/request", "/owner/quote", "/owner/decide", "/owner/book", "/owner/record", "/owner/forecast", "/owner/rent", "/owner/settings",
];
const VIEWPORTS = [
  { name: "phone", width: 390, height: 844 },
  { name: "desktop", width: 1280, height: 800 },
];
// Buttons that start something long, leave the page on purpose, or wipe the sample on purpose.
const SKIP = /play the whole story|reset sample data|yes, reset|clear all|yes, delete|download|send feedback|close|hide|dismiss|cancel/i;

const problems = [];
const note = (where, what) => problems.push(`${where}: ${what}`);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const CONTROL_SELECTOR = "button, [role=button], [role=tab], [role=switch], summary, input[type=checkbox], input[type=radio]";

/** Marks every pressable control on the page with a number and lists them, so each one is clicked by its own mark and nothing can drift out of line. */
const tagControls = (page) =>
  page.evaluate((sel) => {
    document.querySelectorAll("[data-crawl]").forEach((e) => e.removeAttribute("data-crawl"));
    return [...document.querySelectorAll(sel)]
      .filter((e) => {
        const r = e.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== "hidden";
      })
      .map((e, i) => {
        e.setAttribute("data-crawl", String(i));
        return { i, label: (e.getAttribute("aria-label") || e.textContent || e.id || e.type || "").trim().replace(/\s+/g, " ").slice(0, 50), tag: e.tagName, disabled: Boolean(e.disabled) };
      })
      .slice(0, 70);
  }, CONTROL_SELECTOR);

async function resetApp(page) {
  await page.goto(`${BASE}/?reset=1`);
  await page.waitForFunction(() => !window.location.search.includes("reset=1"));
}

/** What a page looks like to someone: its visible text plus the open dialogs, so a change in either counts as an effect. */
const snapshot = (page) =>
  page.evaluate(() => `${location.pathname}${location.search}|${document.querySelectorAll("dialog[open]").length}|${document.body.innerText}|${[...document.querySelectorAll("[aria-pressed],[aria-checked],[aria-selected],[aria-expanded],details")].map((e) => `${e.getAttribute("aria-pressed")}${e.getAttribute("aria-checked")}${e.getAttribute("aria-selected")}${e.getAttribute("aria-expanded")}${e.open ?? ""}`).join("")}|${[...document.querySelectorAll("input,select,textarea")].map((e) => (e.type === "checkbox" || e.type === "radio" ? e.checked : e.value)).join(",")}`);

async function crawlPage(context, vp, route, state) {
  const where = `[${vp.name}, ${state}] ${route}`;
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(`uncaught: ${e.message}`));
  page.on("console", (m) => m.type() === "error" && !/Failed to load resource.*404/.test(m.text()) && errors.push(`console.error: ${m.text().slice(0, 140)}`));
  await page.setViewportSize({ width: vp.width, height: vp.height });
  await page.goto(`${BASE}${route}`);
  await page.waitForLoadState("networkidle");
  await wait(500);

  // Text with a broken value in it.
  const text = await page.evaluate(() => document.body.innerText);
  for (const bad of ["undefined", "NaN", "[object Object]", "null%", "$NaN", "Infinity"]) if (text.includes(bad)) note(where, `the page shows "${bad}"`);

  // Links: every internal one has to lead somewhere that works.
  const hrefs = await page.evaluate(() => [...new Set([...document.querySelectorAll("a[href]")].map((a) => a.getAttribute("href")))]);
  for (const href of hrefs) {
    if (!href || href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("data:") || href.startsWith("http")) continue;
    if (href === "#") {
      note(where, `a link goes to "#" and nowhere`);
      continue;
    }
    const res = await page.request.get(new URL(href, `${BASE}${route}`).toString().split("#")[0]);
    if (res.status() >= 400) note(where, `link ${href} answers ${res.status()}`);
    if (href.includes("#")) {
      const id = href.split("#")[1];
      if (id && new URL(href, `${BASE}${route}`).pathname === route && (await page.locator(`[id="${id}"]`).count()) === 0) note(where, `link ${href} points at an id that is not on the page`);
    }
  }

  // Buttons: press each one on a fresh copy of the page and see whether anything happens.
  const labels = await tagControls(page);
  await page.close();

  for (const { i, label, tag, disabled } of labels) {
    // A disabled control stays in the list so the positions line up with the page, but it is not pressed.
    if (disabled || SKIP.test(label)) continue;
    const p = await context.newPage();
    const pageErrors = [];
    p.on("pageerror", (e) => pageErrors.push(e.message));
    await p.setViewportSize({ width: vp.width, height: vp.height });
    await p.goto(`${BASE}${route}`);
    await p.waitForLoadState("networkidle");
    await wait(350);
    await tagControls(p);
    const before = await snapshot(p);
    const target = p.locator(`[data-crawl="${i}"]`);
    let download = false;
    p.on("download", () => (download = true));
    try {
      try {
        await target.click({ timeout: 4000, trial: false });
      } catch (first) {
        // A check box drawn as a styled label is pressed through its label, the way a person does.
        if (tag !== "INPUT") throw first;
        await target.evaluate((e) => (e.labels?.[0] ?? e).click());
      }
    } catch (e) {
      note(where, `could not press "${label}" (${String(e.message).split("\n")[0].slice(0, 80)})`);
      await p.close();
      continue;
    }
    await wait(700);
    const after = await snapshot(p);
    if (pageErrors.length) note(where, `pressing "${label}" threw: ${pageErrors[0].slice(0, 100)}`);
    if (before === after && !download && tag !== "SUMMARY") note(where, `pressing "${label}" has no visible effect`);
    await p.close();
  }
  for (const e of [...new Set(errors)]) note(where, e);
}

const browser = await launch();
const startFresh = await browser.newContext();
{
  const page = await startFresh.newPage();
  await resetApp(page);
  await page.close();
}
const freshState = await startFresh.storageState();
await startFresh.close();

// A state in the middle of a repair, so the approval card, the quotes and the booking are on screen.
const mid = await browser.newContext({ viewport: { width: 1280, height: 800 } });
{
  const page = await mid.newPage();
  await resetApp(page);
  await page.goto(`${BASE}/owner`);
  await page.getByRole("button", { name: "See how GoHome handles a repair" }).click();
  await page.getByRole("button", { name: "Approve", exact: true }).waitFor({ timeout: 40000 }).catch(() => {});
  await page.close();
}
const midState = await mid.storageState();
await mid.close();

for (const state of ["fresh", "mid-repair"]) {
  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({ storageState: state === "fresh" ? freshState : midState });
    for (const route of ROUTES) {
      if (state === "mid-repair" && !route.startsWith("/owner") && route !== "/tenant") continue;
      try {
        await crawlPage(context, vp, route, state);
      } catch (e) {
        note(`[${vp.name}, ${state}] ${route}`, `the crawl itself stopped: ${String(e.message).split("\n")[0]}`);
      }
    }
    await context.close();
  }
}
await browser.close();

const unique = [...new Set(problems)];
for (const p of unique) console.log(`FOUND ${p}`);
console.log(unique.length === 0 ? "\nCRAWL: nothing found" : `\nCRAWL: ${unique.length} thing${unique.length === 1 ? "" : "s"} to look at`);
process.exit(unique.length === 0 ? 0 : 1);
