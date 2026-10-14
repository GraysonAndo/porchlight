// Walks the whole demo at phone and desktop sizes: the tenant side, then the
// owner side, then the planning tools. Takes a screenshot of every screen into
// docs/screenshots and checks layout on each one.
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
async function resetDemo(page) {
  await page.goto(`${BASE}/?reset=1`);
  await page.waitForFunction(() => !window.location.search.includes("reset=1"));
}

let failures = 0;
const warnings = [];

async function snap(page, vp, name) {
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

  // ---------- Home ----------
  await resetDemo(page);
  await page.getByRole("heading", { name: /Your rental, looked after/ }).waitFor();
  await snap(page, vp, "01-home");

  await page.getByRole("button", { name: /Demo guide/ }).click();
  await page.getByRole("link", { name: /How can we help/ }).waitFor();
  await snap(page, vp, "02-demo-guide-open");
  await page.getByRole("button", { name: /Demo guide/ }).click();

  // ---------- Watch it work ----------
  await page.getByRole("link", { name: /Watch Porchlight work/ }).first().click();
  await page.waitForURL("**/live");
  await snap(page, vp, "03-live-start");
  const next = page.getByRole("button", { name: "Next step" });
  for (let i = 0; i < 6; i++) await next.click();
  await snap(page, vp, "04-live-midway");
  while (await next.isEnabled()) await next.click();
  await snap(page, vp, "05-live-done");
  await page.getByRole("radio", { name: /gas/i }).click();
  while (await next.isEnabled()) await next.click();
  await snap(page, vp, "06-live-gas-done");

  // ---------- SMS console ----------
  await page.goto(`${BASE}/sms`);
  await page.getByLabel("Faster").check();
  await snap(page, vp, "06b-sms-start");
  const phone = vp.width < 1024;
  const tab = async (name) => {
    if (phone) await page.getByRole("tab", { name }).click();
  };
  const tenantPhone = page.locator('[aria-label="Tenant\'s phone"]');
  const ownerPhone = page.locator('[aria-label="Owner\'s phone"]');
  await page.getByRole("button", { name: "Water heater leak" }).click();
  await tenantPhone.getByText(/near an outlet/).waitFor({ timeout: 20000 });
  await tenantPhone.getByRole("button", { name: /^2\s+No$/ }).click();
  await tenantPhone.getByRole("button", { name: "Done" }).waitFor({ timeout: 20000 });
  await tenantPhone.getByRole("button", { name: "Done" }).click();
  await tenantPhone.getByRole("button", { name: "Send a photo" }).waitFor({ timeout: 20000 });
  await tenantPhone.getByText(/silver sticker/).waitFor({ timeout: 20000 });
  await tenantPhone.getByRole("button", { name: "Send a photo" }).click();
  await tenantPhone.getByRole("button", { name: "Label photo" }).click();
  await tenantPhone.getByText(/Is it 15C0412-X/).waitFor({ timeout: 20000 });
  await snap(page, vp, "06c-sms-label-read");
  await tenantPhone.getByRole("button", { name: "Y", exact: true }).click();
  await tenantPhone.getByText(/I'm watching this/).waitFor({ timeout: 20000 });
  await page.getByRole("button", { name: /Skip ahead .*vendor quotes arrive/ }).click();
  await tab("Owner");
  await ownerPhone.getByText(/DECISION NEEDED/).waitFor({ timeout: 20000 });
  await snap(page, vp, "06d-sms-decision");
  await tab("Agent");
  await snap(page, vp, "06d2-sms-agent-log");
  await page.getByRole("button", { name: "Start over" }).click();
  await page.getByRole("button", { name: /Play the full demo/ }).click();
  await tab("Owner");
  await ownerPhone.getByText(/Proof of service is saved/).waitFor({ timeout: 90000 });
  await snap(page, vp, "06e-sms-complete");
  await tab("Agent");
  await snap(page, vp, "06e2-sms-complete-agent");
  await tab("Vendor");
  await snap(page, vp, "06e3-sms-complete-vendor");
  await tab("Tenant");
  await page.getByRole("button", { name: "Start over" }).click();
  await page.getByRole("button", { name: "I smell gas" }).click();
  await tab("Owner");
  await ownerPhone.getByText(/EMERGENCY at/).waitFor({ timeout: 20000 });
  await snap(page, vp, "06f-sms-gas-emergency");

  // ---------- Tenant: one screen, texting Porchlight ----------
  const W = { timeout: 20000 };
  await resetDemo(page);
  await page.getByRole("button", { name: /I am a tenant/ }).click();
  await page.waitForURL("**/tenant");
  await page.locator("#tenant-msg").waitFor();
  await snap(page, vp, "07-tenant-start");
  await page.locator("#tenant-msg").fill("My water heater is leaking");
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await page.getByText(/near an outlet/).waitFor(W);
  await snap(page, vp, "08-tenant-safety-question");
  await page.getByRole("button", { name: /^2\s+No$/ }).click();
  await page.getByRole("button", { name: "Done", exact: true }).waitFor(W);
  await snap(page, vp, "09-tenant-quick-steps");
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await page.getByText(/silver sticker/).waitFor(W);
  await page.getByRole("button", { name: "Send a photo" }).click();
  await snap(page, vp, "10-tenant-photo-menu");
  await page.getByRole("button", { name: "Photo of the label" }).click();
  await page.getByText(/Is it 15C0412-X/).waitFor(W);
  await snap(page, vp, "11-tenant-label-read");
  await page.getByRole("button", { name: "Y", exact: true }).click();
  await page.getByText(/I'm watching this/).waitFor(W);
  await snap(page, vp, "12-tenant-waiting");

  // ---------- Owner: everything is already done, one tap to approve ----------
  await page.goto(`${BASE}/owner`);
  await page.getByRole("button", { name: "Approve", exact: true }).waitFor(W);
  await snap(page, vp, "13-owner-inbox-needs-ok");
  await page.getByRole("button", { name: "Approve", exact: true }).click();
  await page.getByRole("button", { name: "Mark done" }).waitFor(W);
  await snap(page, vp, "14-owner-inbox-booked");
  await page.goto(`${BASE}/tenant`);
  await page.getByText(/Good news: Willow Glen/).waitFor(W);
  await snap(page, vp, "15-tenant-booked");
  await page.getByRole("button", { name: /^1\s+That works$/ }).click();
  await page.getByText(/see you then/).waitFor(W);
  await snap(page, vp, "16-tenant-confirmed");
  await page.goto(`${BASE}/owner`);
  await page.getByRole("button", { name: "Mark done" }).click();
  await page.getByText("All done", { exact: true }).waitFor(W);
  await snap(page, vp, "17-owner-inbox-done");
  await page.goto(`${BASE}/tenant`);
  await page.getByText(/All fixed/).waitFor(W);
  await snap(page, vp, "18-tenant-fixed");
  await page.getByRole("switch", { name: "Text updates" }).click();
  await snap(page, vp, "19-tenant-text-updates-off");

  // ---------- Owner detail pages, filled in by the agent ----------
  await page.goto(`${BASE}/owner/request`);
  await snap(page, vp, "20-owner-request-details");
  await page.goto(`${BASE}/owner/record`);
  await page.getByText("New, added automatically").waitFor(W);
  await snap(page, vp, "21-owner-record-after-install");
  await page.getByRole("link", { name: /Add or check equipment details/ }).click();
  await page.waitForURL("**/owner/label");
  await snap(page, vp, "22-owner-label-intro");
  await page.getByRole("radio", { name: "Type the details in" }).click();
  await page.locator("#label-manufacturer").waitFor();
  await snap(page, vp, "23-owner-label-typing");
  await page.goto(`${BASE}/owner/quote`);
  await page.getByText(/Best pick/).waitFor({ timeout: 8000 });
  await snap(page, vp, "24-owner-quote");
  await page.locator("label", { hasText: "Bayside Plumbing and Heating" }).click();
  await page.getByRole("heading", { name: "Bayside Plumbing and Heating" }).waitFor();
  await page.getByRole("button", { name: "Use a sample quote" }).click();
  await page.getByRole("heading", { name: "Harbor View Plumbing" }).waitFor();
  await snap(page, vp, "25-owner-quote-pasted");
  await page.goto(`${BASE}/owner/decide`);
  await page.getByText("Replace it").waitFor();
  await snap(page, vp, "26-owner-decide");
  await page.goto(`${BASE}/owner/book`);
  await snap(page, vp, "27-owner-book");

  // ---------- Plan ahead tools ----------
  await page.goto(`${BASE}/owner/forecast`);
  await page.getByText("Plan to set aside each year").waitFor();
  await snap(page, vp, "35-tool-forecast");
  await page.getByRole("link", { name: /^Next: Rent increase/ }).click();

  await page.waitForURL("**/owner/rent");
  await page.getByText("OK: within the state cap").waitFor();
  await snap(page, vp, "36-tool-rent-ok");
  await page.locator("#proposed-rent").fill("3600");
  await page.getByText(/Exceeds cap by/).waitFor();
  await snap(page, vp, "37-tool-rent-over-cap");
  await page.locator("#proposed-rent").fill("3360");
  await page.getByLabel("The tenant was given the required written exemption notice.").check();
  await page.getByText(/May be exempt from the state cap/).waitFor();
  await snap(page, vp, "38-tool-rent-exempt");

  // ---------- Tenant cannot reach the label ----------
  await resetDemo(page);
  await page.goto(`${BASE}/tenant`);
  await page.locator("#tenant-msg").fill("water heater is leaking all over the garage");
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await page.getByText(/near an outlet/).waitFor(W);
  await page.getByRole("button", { name: /^2\s+No$/ }).click();
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await page.getByRole("button", { name: "I can't reach it" }).waitFor(W);
  await page.getByRole("button", { name: "I can't reach it" }).click();
  await page.getByText(/work from the inspection report/).waitFor(W);
  await snap(page, vp, "39-tenant-label-skipped");
  await page.goto(`${BASE}/owner/record`);
  await snap(page, vp, "40-owner-record-missing");

  // ---------- Emergency example ----------
  await resetDemo(page);
  await page.goto(`${BASE}/tenant`);
  await page.getByRole("button", { name: "I smell gas" }).click();
  await page.getByText(/leave the home/i).first().waitFor(W);
  await page.waitForTimeout(2500);
  await snap(page, vp, "41-tenant-emergency-gas");
  await page.goto(`${BASE}/owner`);
  await page.getByText("Emergency: Gas safety").first().waitFor(W);
  await snap(page, vp, "43-owner-inbox-emergency");

  // ---------- Empty state, sample repair, questions, rent ----------
  await resetDemo(page);
  await page.goto(`${BASE}/owner`);
  await page.getByText("All quiet").waitFor();
  await snap(page, vp, "45-owner-inbox-empty");
  await page.getByRole("button", { name: "Show me a sample repair" }).click();
  await page.getByRole("button", { name: "Approve", exact: true }).waitFor(W);
  await snap(page, vp, "46-owner-inbox-sample-repair");
  await page.getByRole("button", { name: "Approve", exact: true }).click();
  await page.getByRole("button", { name: "Mark done" }).waitFor(W);
  await snap(page, vp, "48-owner-inbox-booked");
  await resetDemo(page);
  await page.goto(`${BASE}/tenant`);
  await page.getByRole("button", { name: "How much is my rent?" }).click();
  await page.getByText(/\$3,200 per month/).waitFor(W);
  await page.locator("#tenant-msg").fill("Can I have a dog?");
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await page.getByText(/I don't know whether pets are allowed/).waitFor(W);
  await snap(page, vp, "49-tenant-question-answered");
  await page.goto(`${BASE}/owner/rent`);
  await page.locator("#current-rent").fill("");
  await page.getByText("Fill in the numbers to see the result").waitFor();
  await snap(page, vp, "50-tool-rent-empty-input");
  await page.goto(`${BASE}/owner/quote`);
  await page.locator("#paste-quote").fill("Furnace replacement\nLabor ..... $2,000\nTotal $6,000");
  await page.getByRole("button", { name: "Check this quote" }).click();
  await page.getByText(/not in Porchlight's price table yet/).waitFor();
  await snap(page, vp, "51-owner-quote-job-not-in-table");
  await page.goto(`${BASE}/pricing`);
  await page.getByRole("button", { name: "I would pick Plus" }).click();
  await snap(page, vp, "52-pricing");
  await page.goto(`${BASE}/about`);
  await page.getByText("What counts as an emergency?").click();
  await snap(page, vp, "53-about-and-faq");
  await page.goto(`${BASE}/nope`);
  await page.getByText(/not part of the demo/).waitFor();
  await snap(page, vp, "54-not-found");

  // ---------- Feedback ----------
  await page.getByRole("button", { name: "Leave feedback" }).click();
  await page.getByText("How clear was this screen?").waitFor();
  await page.locator("dialog").getByText("4", { exact: true }).click();
  await page.getByLabel(/What was confusing or missing/).fill("The owner steps were clear.");
  await snap(page, vp, "44-feedback-sheet");
  await page.getByRole("button", { name: "Save feedback" }).click();
  await page.getByText(/Saved. Thank you/).waitFor();
  await page.getByRole("button", { name: "Done" }).click();
  await page.goto(`${BASE}/feedback`);
  await page.getByText("The owner steps were clear.").first().waitFor();
  await snap(page, vp, "45-feedback-notes");

  // The deliberate visit to a page that does not exist logs one 404. That is expected.
  for (const e of errors.filter((x) => !/status of 404/.test(x))) {
    console.log(`FAIL [${vp.name}] ${e}`);
    failures++;
  }
  await context.close();
}

const browser = await launch();
for (const vp of VIEWPORTS) {
  console.log(`Walking the demo at ${vp.width}x${vp.height}...`);
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
