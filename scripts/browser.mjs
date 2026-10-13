// Shared Playwright helpers for the verification scripts.
// Uses the preinstalled Chromium. Do not run "playwright install".

import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

function loadPlaywright() {
  const candidates = ["playwright", "playwright-core", "/opt/node22/lib/node_modules/playwright"];
  for (const name of candidates) {
    try {
      return require(name);
    } catch {
      // Try the next one.
    }
  }
  throw new Error("Playwright not found. Install it globally or add it as a dev dependency.");
}

export const { chromium } = loadPlaywright();

export const BASE = process.env.BASE_URL ?? "http://localhost:3000";

export async function launch() {
  try {
    return await chromium.launch();
  } catch {
    return await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium" });
  }
}

/** Collects console errors and uncaught exceptions on a page. */
export function watchErrors(page, sink) {
  page.on("pageerror", (err) => sink.push(`pageerror: ${err.message}`));
  page.on("console", (msg) => {
    if (msg.type() === "error") sink.push(`console.error: ${msg.text()}`);
  });
  page.on("requestfailed", (req) => {
    const url = req.url();
    if (!url.startsWith(BASE)) sink.push(`external request failed: ${url}`);
  });
}

/** Layout checks run on the current page. Returns a list of problems. */
export async function layoutProblems(page) {
  return page.evaluate(() => {
    const problems = [];
    const doc = document.documentElement;
    if (doc.scrollWidth > window.innerWidth + 1) {
      problems.push(`horizontal scroll: scrollWidth ${doc.scrollWidth} > ${window.innerWidth}`);
    }

    for (const img of Array.from(document.images)) {
      if (img.complete && img.naturalWidth === 0) problems.push(`broken image: ${img.getAttribute("src")}`);
      if (!img.getAttribute("alt")) problems.push(`image without alt: ${img.getAttribute("src")}`);
    }

    // Anything poking out of the right edge, unless it sits inside a scroll container.
    const inScroller = (el) => {
      for (let p = el.parentElement; p; p = p.parentElement) {
        const o = getComputedStyle(p).overflowX;
        if (o === "auto" || o === "scroll" || o === "hidden") return true;
      }
      return false;
    };
    for (const el of Array.from(document.body.querySelectorAll("*"))) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      const style = getComputedStyle(el);
      if (style.position === "fixed" || style.visibility === "hidden") continue;
      if (r.right > window.innerWidth + 1 && !inScroller(el)) {
        problems.push(`overflows right edge: <${el.tagName.toLowerCase()}> "${(el.textContent || "").trim().slice(0, 40)}"`);
        break;
      }
    }

    // Tap targets under 44px tall (buttons, links styled as buttons, form fields).
    const small = [];
    const targets = document.querySelectorAll("button, input:not([type=radio]):not([type=checkbox]):not([type=file]), select, textarea, summary, a.btn");
    for (const el of Array.from(targets)) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if (r.height < 43.5) small.push(`${el.tagName.toLowerCase()} "${(el.textContent || el.getAttribute("aria-label") || el.id || "").trim().slice(0, 30)}" is ${Math.round(r.height)}px tall`);
    }
    if (small.length) problems.push(`small tap targets: ${small.join("; ")}`);

    // Inputs without a label.
    for (const el of Array.from(document.querySelectorAll("input, select, textarea"))) {
      if (el.type === "hidden") continue;
      const labelled = el.labels && el.labels.length > 0;
      if (!labelled && !el.getAttribute("aria-label") && !el.getAttribute("aria-labelledby")) {
        problems.push(`unlabelled field: ${el.tagName.toLowerCase()}#${el.id}`);
      }
    }
    return problems;
  });
}
