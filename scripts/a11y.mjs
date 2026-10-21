// Accessibility and responsive audit for GoHome. Visits every page at phone and desktop widths and checks:
// horizontal scroll, accessible names, tap target size, text size, text contrast, heading order, landmarks,
// duplicate ids, a visible keyboard focus ring, and a title and lang on every page.
//
// This is a script-based check. It is not a Lighthouse run and it is not a test on a real phone.
//
// Usage: BASE_URL=http://localhost:3000 node scripts/a11y.mjs

import { launch, watchErrors, BASE } from "./browser.mjs";

const ROUTES = [
  "/", "/about", "/pricing", "/feedback",
  "/tenant", "/tenant/home", "/tenant/pay", "/tenant/settings", "/tenant/texts", "/tenant/guides/heater-water-off",
  "/owner", "/owner/request", "/owner/quote", "/owner/decide", "/owner/book", "/owner/record", "/owner/forecast", "/owner/rent", "/owner/settings",
];
const VIEWPORTS = [
  { name: "phone 360", width: 360, height: 740 },
  { name: "phone 390", width: 390, height: 844 },
  { name: "desktop", width: 1280, height: 800 },
];

/** Runs inside the page. Returns { fail: string[], warn: string[] }. */
function audit() {
  const fail = [];
  const warn = [];
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none";
  };
  const label = (el) => (el.textContent || el.getAttribute("aria-label") || el.id || el.tagName).trim().replace(/\s+/g, " ").slice(0, 40);

  // 1. Horizontal scroll.
  const doc = document.documentElement;
  if (doc.scrollWidth > window.innerWidth + 1) fail.push(`horizontal scroll: ${doc.scrollWidth} > ${window.innerWidth}`);

  // 2. Page basics.
  if (!document.title.trim()) fail.push("no page title");
  if (!document.documentElement.lang) fail.push("no lang on <html>");
  if (document.querySelectorAll("main").length !== 1) fail.push(`expected one <main>, found ${document.querySelectorAll("main").length}`);
  const ids = new Map();
  for (const el of document.querySelectorAll("[id]")) ids.set(el.id, (ids.get(el.id) ?? 0) + 1);
  for (const [id, n] of ids) if (n > 1) fail.push(`duplicate id: ${id} (${n})`);

  // 3. Headings: exactly one h1 in the page content, and no skipped levels.
  const heads = Array.from(document.querySelectorAll("h1,h2,h3,h4,h5,h6")).filter(visible);
  const h1s = heads.filter((h) => h.tagName === "H1");
  if (h1s.length !== 1) fail.push(`expected one visible <h1>, found ${h1s.length}`);
  let prev = 0;
  for (const h of heads) {
    const level = Number(h.tagName[1]);
    if (prev && level > prev + 1) fail.push(`heading level skips from h${prev} to h${level}: "${label(h)}"`);
    prev = level;
  }

  // 4. Accessible names for links, buttons, fields.
  const nameOf = (el) => {
    const aria = el.getAttribute("aria-label");
    if (aria && aria.trim()) return aria.trim();
    const by = el.getAttribute("aria-labelledby");
    if (by) {
      const t = by.split(/\s+/).map((id) => document.getElementById(id)?.textContent ?? "").join(" ").trim();
      if (t) return t;
    }
    if (el.labels && el.labels.length) return Array.from(el.labels).map((l) => l.textContent).join(" ").trim();
    const text = (el.textContent || "").trim();
    if (text) return text;
    const img = el.querySelector("img[alt]");
    if (img && img.getAttribute("alt")) return img.getAttribute("alt");
    return el.getAttribute("title") || "";
  };
  for (const el of document.querySelectorAll("a[href], button, input:not([type=hidden]), select, textarea, summary")) {
    if (!visible(el) && !el.classList.contains("sr-only")) continue;
    const name = nameOf(el);
    if (!name) fail.push(`no accessible name: <${el.tagName.toLowerCase()}> ${el.outerHTML.slice(0, 80)}`);
    // Block children glued together read as one word ("Sample OwnerOwner").
    if (/[a-z][A-Z][a-z]+$/.test(name) && /Owner$|Tenant$/.test(name) && !/\s/.test(name.slice(-8))) {
      const m = name.match(/([a-z])(Owner|Tenant)$/);
      if (m) fail.push(`accessible name runs two words together: "${name}"`);
    }
  }

  // 5. Tap targets. WCAG 2.2 AA says 24px minimum. We hold buttons and links styled as buttons to 44px, checkboxes to 24px.
  for (const el of document.querySelectorAll("a[href], button, summary, input, select, textarea")) {
    if (!visible(el)) continue;
    // The skip link is only on screen while it has focus.
    if (el.classList.contains("sr-only")) continue;
    // A visually hidden radio or checkbox is operated through its label, so the label is the target.
    if (el.tagName === "INPUT" && el.classList.contains("sr-only")) continue;
    const r = el.getBoundingClientRect();
    const isCheck = el.tagName === "INPUT" && (el.type === "checkbox" || el.type === "radio");
    if (el.tagName === "INPUT" && el.type === "file") continue;
    // A checkbox sits inside a label that is itself the tap target, but the box should still be 24px.
    if (isCheck) {
      if (r.width < 23.5 || r.height < 23.5) fail.push(`checkbox or radio under 24px: ${label(el.closest("label") || el)} (${Math.round(r.width)}x${Math.round(r.height)})`);
      continue;
    }
    const inline = el.tagName === "A" && getComputedStyle(el).display === "inline" && !el.classList.contains("btn");
    if (inline) {
      // A link inside a sentence is exempt from the target size rule by WCAG, but it still must not be tiny text.
      continue;
    }
    if (r.height < 23.5 || r.width < 23.5) fail.push(`tap target under 24px: ${label(el)} (${Math.round(r.width)}x${Math.round(r.height)})`);
    else if (r.height < 43.5 && (el.tagName === "BUTTON" || el.classList.contains("btn"))) warn.push(`button under 44px: ${label(el)} (${Math.round(r.height)}px)`);
  }

  // 6. Text size and contrast.
  const parseColor = (c) => {
    const m = c.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number);
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  };
  const over = (top, bottom) => ({
    r: top.r * top.a + bottom.r * (1 - top.a),
    g: top.g * top.a + bottom.g * (1 - top.a),
    b: top.b * top.a + bottom.b * (1 - top.a),
    a: 1,
  });
  const bgOf = (el) => {
    const layers = [];
    for (let p = el; p; p = p.parentElement) {
      const s = getComputedStyle(p);
      if (s.backgroundImage !== "none") return null; // gradient or image: skip
      const c = parseColor(s.backgroundColor);
      if (c && c.a > 0) layers.push(c);
      if (c && c.a === 1) break;
    }
    let base = { r: 255, g: 255, b: 255, a: 1 };
    for (const l of layers.reverse()) base = over(l, base);
    return base;
  };
  const lum = (c) => {
    const f = (v) => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
  };
  const small = new Set();
  const lowContrast = new Map();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const text = n.textContent.trim();
    if (!text) continue;
    const el = n.parentElement;
    if (!el || !visible(el) || el.closest("script,style,noscript,[hidden]")) continue;
    if (el.closest(".sr-only")) continue;
    // Disabled controls are exempt from the contrast rule (WCAG 1.4.3).
    if (el.closest(":disabled, [aria-disabled=true]")) continue;
    const s = getComputedStyle(el);
    if (s.opacity === "0") continue;
    const px = parseFloat(s.fontSize);
    if (px < 11.99) small.add(`${px}px "${text.slice(0, 30)}"`);
    const fg = parseColor(s.color);
    const bg = bgOf(el);
    if (!fg || !bg) continue;
    const eff = over({ ...fg, a: fg.a * Number(s.opacity) }, bg);
    const l1 = lum(eff);
    const l2 = lum(bg);
    const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    const bold = Number(s.fontWeight) >= 700;
    const large = px >= 24 || (px >= 18.66 && bold);
    const need = large ? 3 : 4.5;
    if (ratio < need) lowContrast.set(`${ratio.toFixed(2)}:1 needs ${need} "${text.slice(0, 30)}"`, true);
  }
  for (const t of small) fail.push(`text under 12px: ${t}`);
  for (const t of lowContrast.keys()) fail.push(`low contrast ${t}`);

  return { fail, warn };
}

const browser = await launch();
let failures = 0;
const warnings = new Map();
for (const vp of VIEWPORTS) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
  const page = await ctx.newPage();
  const errors = [];
  watchErrors(page, errors);
  await page.goto(`${BASE}/?reset=1`);
  await page.waitForFunction(() => !window.location.search.includes("reset=1"));
  for (const route of ROUTES) {
    await page.goto(`${BASE}${route}`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(400);
    const { fail, warn } = await page.evaluate(audit);
    for (const f of fail) {
      failures++;
      console.log(`FAIL [${vp.name}] ${route}: ${f}`);
    }
    for (const w of warn) warnings.set(`${route}: ${w}`, (warnings.get(`${route}: ${w}`) ?? 0) + 1);
  }
  // The same checks again with real content on screen: a guide open, the owner's approval card, an emergency, a late rent.
  const wait20 = { timeout: 20000 };
  const report = async (where) => {
    const { fail } = await page.evaluate(audit);
    for (const f of fail) {
      failures++;
      console.log(`FAIL [${vp.name}] ${where}: ${f}`);
    }
  };
  await page.goto(`${BASE}/?reset=1`);
  await page.waitForFunction(() => !window.location.search.includes("reset=1"));
  await page.goto(`${BASE}/tenant`);
  await page.getByRole("button", { name: "My water heater is leaking" }).click();
  await page.getByText(/near an outlet/).waitFor(wait20);
  await report("tenant chat, first reply");
  await page.getByRole("button", { name: /^No$/ }).click();
  await page.getByRole("button", { name: "Show me how" }).first().waitFor(wait20);
  await page.getByRole("button", { name: "Show me how" }).first().click();
  await page.locator("dialog[open]").getByText(/Step 1 of/).waitFor();
  await report("tenant picture guide open");
  await page.locator("dialog[open]").getByRole("button", { name: "Close" }).first().click().catch(() => page.keyboard.press("Escape"));
  await page.keyboard.press("Escape");
  await page.getByText(/Looking for licensed plumbers/).waitFor(wait20).catch(() => {});
  await page.goto(`${BASE}/owner`);
  await page.getByRole("button", { name: /Approve/ }).first().waitFor(wait20).catch(() => {});
  await report("owner inbox with the approval card");
  await page.goto(`${BASE}/?reset=1`);
  await page.waitForFunction(() => !window.location.search.includes("reset=1"));
  await page.goto(`${BASE}/tenant`);
  await page.locator("#tenant-msg").fill("I smell gas and feel dizzy");
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await page.getByText(/sounds like an emergency/i).first().waitFor(wait20);
  await page.waitForTimeout(3500);
  await report("tenant emergency reply with the 911 button");

  // Keyboard: Tab through the welcome page and check that every focused control shows a ring.
  await page.goto(`${BASE}/`);
  await page.waitForLoadState("networkidle");
  let unfocused = 0;
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press("Tab");
    const ring = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return true;
      const s = getComputedStyle(el);
      return (s.outlineStyle !== "none" && parseFloat(s.outlineWidth) > 0) || s.boxShadow !== "none";
    });
    if (!ring) unfocused++;
  }
  if (unfocused) {
    failures++;
    console.log(`FAIL [${vp.name}] /: ${unfocused} focused controls showed no focus ring`);
  }
  for (const e of errors) {
    failures++;
    console.log(`FAIL [${vp.name}] console: ${e}`);
  }
  await ctx.close();
}
await browser.close();
if (warnings.size) {
  console.log(`\n${warnings.size} warnings (buttons between 24 and 44px):`);
  for (const w of [...warnings.keys()].slice(0, 20)) console.log(`  warn ${w}`);
}
console.log(failures === 0 ? "\nA11Y: PASS" : `\nA11Y: ${failures} problem${failures === 1 ? "" : "s"}`);
process.exit(failures === 0 ? 0 : 1);
