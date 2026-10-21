// Walks GoHome at phone and desktop sizes: the landing page, the tenant side, the owner side, and the pages
// around them. Takes a screenshot of every screen into docs/screenshots and checks layout on each one.
//
// Usage: BASE_URL=http://localhost:3000 node scripts/walkthrough.mjs

import { mkdirSync, readdirSync, unlinkSync } from "node:fs";
import { launch, layoutProblems, watchErrors, BASE } from "./browser.mjs";

const OUT = new URL("../docs/screenshots/", import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });
// Start clean so old screenshots from earlier versions do not linger.
for (const f of readdirSync(OUT)) if (f.endsWith(".png")) unlinkSync(`${OUT}${f}`);

const VIEWPORTS = [
  { name: "mobile", width: 390, height: 844 },
  { name: "desktop", width: 1280, height: 800 },
];

/** Opens ?reset=1 and waits until the reset has actually happened (the page removes the flag). */
async function resetApp(page) {
  await page.goto(`${BASE}/?reset=1`);
  await page.waitForFunction(() => !window.location.search.includes("reset=1"));
}

let failures = 0;
const warnings = [];
const W = { timeout: 20000 };

async function snap(page, vp, name) {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);
  // Finish entrance animations, so a full-page capture never catches an element half faded in.
  await page.evaluate(() => document.getAnimations().forEach((a) => { if (a.effect && a.effect.getComputedTiming().iterations !== Infinity) a.finish(); }));
  await page.screenshot({ path: `${OUT}${name}-${vp.name}.png`, fullPage: true, animations: "disabled" });
  const problems = await layoutProblems(page);
  for (const p of problems) {
    const text = `[${vp.name}] ${name}: ${p}`;
    if (p.startsWith("small tap targets")) warnings.push(text);
    else {
      console.log(`FAIL ${text}`);
      failures++;
    }
  }
}

async function run(browser, vp) {
  const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
  const page = await context.newPage();
  const errors = [];
  watchErrors(page, errors);
  const phone = vp.width < 1024;

  // ---------- Landing ----------
  await resetApp(page);
  await page.goto(`${BASE}/`);
  await page.getByRole("heading", { name: "GoHome" }).waitFor();
  await snap(page, vp, "01-landing");

  // ---------- Tenant: chat with GoHome, and what GoHome is doing ----------
  await page.getByRole("button", { name: /Tenant/ }).click();
  await page.waitForURL("**/tenant");
  await page.locator("#tenant-msg").waitFor();
  await snap(page, vp, "02-tenant-start");
  await page.getByRole("button", { name: "My water heater is leaking" }).click();
  await page.getByText(/near an outlet/).waitFor(W);
  await page.waitForTimeout(1500);
  await snap(page, vp, "03-tenant-safety-question");
  await page.getByRole("button", { name: /^No$/ }).click();
  await page.getByRole("button", { name: "Show me how" }).first().waitFor(W);
  await page.waitForTimeout(2500);
  await snap(page, vp, "04-tenant-quick-steps");
  if (phone) {
    await page.getByRole("tab", { name: /What GoHome is doing/ }).click();
    await snap(page, vp, "05-tenant-agent-tab");
    await page.getByRole("tab", { name: "Chat" }).click();
  }

  // The picture guide for this exact heater.
  await page.getByRole("button", { name: "Show me how" }).first().click();
  const dialog = page.locator("dialog[open]");
  await dialog.getByText("Step 1 of 6").waitFor();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}06-guide-step-1-${vp.name}.png` });
  for (let i = 0; i < 2; i++) await dialog.getByRole("button", { name: "Next step" }).click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}07-guide-step-3-${vp.name}.png` });
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await page.getByText(/I'm watching this/).waitFor(W);
  await page.waitForTimeout(1500);
  await snap(page, vp, "08-tenant-waiting");

  // ---------- Owner: everything is already done, one tap to approve ----------
  await page.goto(`${BASE}/owner`);
  await page.getByRole("button", { name: "Approve", exact: true }).waitFor(W);
  await page.waitForTimeout(1200);
  await snap(page, vp, "09-owner-inbox-needs-ok");
  await page.getByRole("tab", { name: /Texts from GoHome/ }).click();
  await snap(page, vp, "10-owner-texts");
  await page.getByRole("tab", { name: /What GoHome is doing/ }).click();
  await page.getByRole("button", { name: "Approve", exact: true }).click();
  await page.getByRole("button", { name: "Mark done" }).waitFor(W);
  await snap(page, vp, "11-owner-inbox-booked");
  await page.goto(`${BASE}/tenant`);
  await page.getByText(/Good news: Willow Glen/).waitFor(W);
  await snap(page, vp, "12-tenant-booked");
  await page.getByRole("button", { name: /^That works$/ }).click();
  await page.getByText(/see you then/).waitFor(W);
  await page.goto(`${BASE}/owner`);
  await page.getByRole("button", { name: "Mark done" }).click();
  await page.getByText(/Done: the new water heater is in your home record/).waitFor(W);
  await snap(page, vp, "13-owner-inbox-done");
  await page.goto(`${BASE}/tenant`);
  await page.getByText(/All fixed/).waitFor(W);
  await snap(page, vp, "14-tenant-fixed");

  // ---------- Tenant: My home and the guides ----------
  await page.goto(`${BASE}/tenant/home`);
  await page.getByText("What is in your home").waitFor();
  await snap(page, vp, "15-tenant-my-home");
  // ---------- Tenant: paying rent and utilities in the embedded checkout ----------
  await page.goto(`${BASE}/tenant/pay`);
  const checkout = page.frameLocator('iframe[title="Secure checkout"]');
  await checkout.getByText("Secure checkout").waitFor(W);
  await snap(page, vp, "15b-tenant-pay");
  await checkout.getByRole("button", { name: /^Pay \$/ }).click();
  await page.waitForTimeout(300);
  await snap(page, vp, "15c-tenant-pay-errors");
  await checkout.getByRole("button", { name: "Use the sample card" }).click();
  await checkout.getByRole("button", { name: /^Pay \$/ }).click();
  await checkout.getByText("Payment received").waitFor(W);
  await snap(page, vp, "15d-tenant-pay-receipt");
  await checkout.getByRole("button", { name: "Done" }).click();
  await page.waitForTimeout(500);

  // ---------- Settings, both sides ----------
  await page.goto(`${BASE}/tenant/settings`);
  await snap(page, vp, "15e-tenant-settings");
  await page.goto(`${BASE}/owner/settings`);
  await snap(page, vp, "15f-owner-settings");
  await page.goto(`${BASE}/owner`);
  await page.waitForTimeout(800);
  await snap(page, vp, "15g-owner-inbox-with-payment");

  await page.goto(`${BASE}/tenant/guides/furnace-no-heat`);
  await page.getByText("Step 1 of 4").waitFor();
  await snap(page, vp, "16-tenant-guide-furnace");
  await page.goto(`${BASE}/tenant/guides/breaker-reset`);
  await page.getByRole("button", { name: "Next step" }).click();
  await page.getByRole("button", { name: "Next step" }).click();
  await snap(page, vp, "17-tenant-guide-breaker");

  // ---------- Owner: details, records, and planning ----------
  await page.goto(`${BASE}/owner/request`);
  await snap(page, vp, "18-owner-request");
  await page.goto(`${BASE}/owner/quote`);
  await page.getByText(/Best pick/).waitFor();
  await snap(page, vp, "19-owner-quotes");
  await page.getByRole("button", { name: "Use a sample quote" }).click();
  await page.getByRole("heading", { name: "Harbor View Plumbing" }).waitFor();
  await snap(page, vp, "20-owner-quote-pasted");
  await page.goto(`${BASE}/owner/decide`);
  await page.getByText("Replace it").waitFor();
  await snap(page, vp, "21-owner-decision");
  await page.goto(`${BASE}/owner/book`);
  await snap(page, vp, "22-owner-booking");
  await page.goto(`${BASE}/owner/record`);
  await page.getByText("New, added automatically").waitFor();
  await snap(page, vp, "23-owner-home-record");
  await page.goto(`${BASE}/owner/forecast`);
  await page.getByText("Plan to set aside each year").waitFor();
  await snap(page, vp, "24-owner-forecast");
  await page.goto(`${BASE}/owner/rent`);
  await page.getByText("Confirm your area's inflation figure first").first().waitFor();
  await page.getByLabel(/I checked this inflation figure for my area/).check();
  await page.getByText("OK to send: within the yearly limit").first().waitFor();
  await snap(page, vp, "25-owner-rent-ok");
  await page.locator("#proposed-rent").fill("3600");
  await page.getByText(/Do not send: over the limit by/).first().waitFor();
  await snap(page, vp, "26-owner-rent-over-cap");

  // ---------- Emergency and the empty states ----------
  await resetApp(page);
  await page.goto(`${BASE}/tenant`);
  await page.getByRole("button", { name: "I smell gas" }).click();
  await page.getByText(/leave the home/i).first().waitFor(W);
  await page.waitForTimeout(2500);
  await snap(page, vp, "27-tenant-emergency-gas");
  await page.goto(`${BASE}/owner`);
  await page.getByText("Emergency: Gas safety").first().waitFor(W);
  await snap(page, vp, "28-owner-inbox-emergency");

  await resetApp(page);
  await page.goto(`${BASE}/owner`);
  await page.getByText(/needs your attention/).first().waitFor();
  await snap(page, vp, "29-owner-inbox-empty");
  await page.goto(`${BASE}/tenant`);
  await page.getByRole("button", { name: "How much is my rent?" }).click();
  await page.getByText(/\$3,200 per month/).first().waitFor(W);
  await page.locator("#tenant-msg").fill("Can I have a dog?");
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await page.getByText(/I don't know whether pets are allowed/).waitFor(W);
  await snap(page, vp, "30-tenant-question-answered");

  // ---------- Live preview prompts ----------
  await resetApp(page);
  await page.goto(`${BASE}/owner`);
  await page.getByText(/A tenant can text GoHome any time/).waitFor(W);
  await snap(page, vp, "27b-owner-live-preview-start");
  await page.getByRole("button", { name: /Act as the tenant: report a leaking water heater/ }).click();
  await page.getByRole("button", { name: /Act as the tenant: No, nothing electrical/ }).waitFor(W);
  await snap(page, vp, "27c-owner-live-preview-tenant-question");
  await page.getByRole("button", { name: /Act as the tenant: No, nothing electrical/ }).click();
  await page.getByRole("button", { name: /Act as the tenant: Done/ }).click();
  await page.getByRole("button", { name: "Approve", exact: true }).waitFor(W);
  await page.waitForTimeout(800);
  await snap(page, vp, "27d-owner-live-preview-approval");
  await page.goto(`${BASE}/tenant`);
  await page.getByRole("button", { name: /Act as the owner: Approve/ }).waitFor(W);
  await snap(page, vp, "27e-tenant-live-preview-owner-plan");

  // ---------- Editing the home record, and the phone preview ----------
  await resetApp(page);
  await page.goto(`${BASE}/owner/record`);
  await page.getByRole("button", { name: "Edit details" }).first().click();
  await page.getByLabel("Model", { exact: true }).waitFor();
  await snap(page, vp, "27f-owner-record-edit");
  await page.goto(`${BASE}/owner/rent`);
  await page.getByText("From your lease").waitFor();
  await snap(page, vp, "27g-owner-rent-prefilled");
  await page.getByLabel(/I checked this inflation figure for my area/).check();
  await page.getByRole("button", { name: "Send notice to Sample Tenant" }).click();
  await page.getByText(/was told by text, and the notice goes by mail/).waitFor(W);
  await snap(page, vp, "27h-owner-rent-notice-sent");
  await page.goto(`${BASE}/tenant/texts`);
  await page.getByRole("region", { name: /phone showing a text conversation/ }).getByRole("button", { name: "My water heater is leaking" }).click();
  await page.getByRole("region", { name: /phone showing a text conversation/ }).getByText(/near an outlet/).waitFor(W);
  await page.getByRole("region", { name: /phone showing a text conversation/ }).getByRole("button", { name: /^No$/ }).click();
  await page.getByText(/picture guide for your heater/i).waitFor(W);
  await page.waitForTimeout(500);
  await snap(page, vp, "27i-tenant-text-thread-phone");

  // ---------- Pricing, about, 404, feedback ----------
  await page.goto(`${BASE}/pricing`);
  await page.getByRole("button", { name: "I would pick Plus" }).click();
  await snap(page, vp, "31-pricing");
  await page.goto(`${BASE}/about`);
  await page.locator("#team").waitFor();
  // The cards fade in as they scroll into view, so scroll through before taking the picture.
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 300) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 120));
    }
  });
  await page.waitForTimeout(900);
  await snap(page, vp, "32a-about-team");
  await page.getByText("What counts as an emergency?").click();
  await snap(page, vp, "32-about-and-faq");
  await page.goto(`${BASE}/nope`);
  await page.getByText(/We could not find that page/).waitFor();
  await snap(page, vp, "33-not-found");
  await page.getByRole("button", { name: "Send feedback" }).click();
  await page.getByText("How clear was this screen?").waitFor();
  await page.locator("dialog").getByText("4", { exact: true }).click();
  await page.getByLabel(/What was confusing or missing/).fill("The tenant screen was easy to follow.");
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}34-feedback-sheet-${vp.name}.png` });
  await page.getByRole("button", { name: "Save feedback" }).click();
  await page.getByText(/Saved. Thank you/).waitFor();
  await page.getByRole("button", { name: "Done" }).click();
  await page.goto(`${BASE}/feedback`);
  await page.getByText("The tenant screen was easy to follow.").first().waitFor();
  await snap(page, vp, "35-feedback-notes");

  // The deliberate visit to a page that does not exist logs one 404. That is expected.
  for (const e of errors.filter((x) => !/status of 404/.test(x))) {
    console.log(`FAIL [${vp.name}] ${e}`);
    failures++;
  }
  await context.close();
}

const browser = await launch();
for (const vp of VIEWPORTS) {
  console.log(`Walking the app at ${vp.width}x${vp.height}...`);
  try {
    await run(browser, vp);
  } catch (err) {
    console.log(`FAIL [${vp.name}] walkthrough stopped: ${err.message.split("\n").slice(0, 4).join(" | ")}`);
    failures++;
  }
}
await browser.close();

if (warnings.length) {
  console.log("\nWarnings:");
  for (const w of warnings) console.log(`  ${w}`);
}
console.log(failures === 0 ? "\nWalkthrough passed." : `\nWalkthrough finished with ${failures} failure(s).`);
process.exit(failures === 0 ? 0 : 1);
