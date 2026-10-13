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

let failures = 0;
const warnings = [];

async function snap(page, vp, name) {
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}${name}-${vp.name}.png`, fullPage: true });
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
  await page.goto(`${BASE}/?reset=1`);
  await page.getByRole("heading", { name: /Your rental, looked after/ }).waitFor();
  await snap(page, vp, "01-home");

  await page.getByRole("button", { name: /Demo guide/ }).click();
  await page.getByRole("link", { name: /Report a problem/ }).waitFor();
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

  // ---------- Tenant ----------
  await page.goto(`${BASE}/?reset=1`);
  await page.getByRole("button", { name: /I am a tenant/ }).click();
  await page.waitForURL("**/tenant/request");
  await page.getByRole("button", { name: "Use sample photo" }).click();
  await page.getByAltText(/Sample photo of a water heater leaking/).waitFor();
  await snap(page, vp, "07-tenant-1-report");
  await page.getByRole("button", { name: "Submit" }).click();

  await page.waitForURL("**/tenant/safety");
  await page.getByText("Reading your request and photo").waitFor();
  await snap(page, vp, "08-tenant-2-safety-thinking");
  await page.getByText("Owner notified").first().waitFor({ timeout: 8000 });
  await snap(page, vp, "09-tenant-2-safety");
  await page.locator("summary", { hasText: "How to do this" }).first().click();
  await page.getByText("Stop and get help if:").first().waitFor();
  await snap(page, vp, "10-tenant-2-safety-guide-open");
  await page.locator("summary", { hasText: "How to do this" }).first().click();
  await page.locator("summary", { hasText: "See what Porchlight did with your report" }).click();
  await page.getByText("check_emergency_rules").waitFor();
  await snap(page, vp, "11-tenant-2-agent-log");
  await page.locator("#answer-0").fill("A slow, steady drip");
  await page.locator("#answer-1").fill("No, only the garage floor");
  await page.locator("#answer-2").fill("No gas smell");
  await page.getByRole("button", { name: "Send my answers" }).click();
  await page.getByText(/Answers sent to Sample Owner/).waitFor();
  await snap(page, vp, "12-tenant-2-answers-sent");
  await page.getByRole("link", { name: /Next: One quick photo/ }).click();

  await page.waitForURL("**/tenant/label");
  await page.getByText("Why Porchlight is asking").waitFor();
  await snap(page, vp, "13-tenant-3-label-ask");
  await page.getByRole("button", { name: "Use sample label photo" }).click();
  await page.getByText("Reading brand, model, serial").waitFor();
  await snap(page, vp, "14-tenant-3-label-scanning");
  await page.locator("#label-serial").waitFor({ timeout: 8000 });
  await snap(page, vp, "15-tenant-3-label-read");
  await page.getByRole("button", { name: "Looks right" }).click();
  await page.getByRole("button", { name: "Send to Porchlight" }).click();
  await page.getByText("Porchlight has what it needs").waitFor();
  await snap(page, vp, "16-tenant-3-label-saved");
  await page.getByRole("link", { name: "See request status" }).click();

  await page.waitForURL("**/tenant/status");
  await page.getByText("Your label photo was read").waitFor();
  await snap(page, vp, "17-tenant-4-status-waiting");
  await page.getByRole("link", { name: "Continue as the owner" }).click();

  // ---------- Owner repair flow ----------
  await page.waitForURL("**/owner/request");
  await page.getByText("AI confidence").waitFor({ timeout: 8000 });
  await snap(page, vp, "18-owner-1-request");
  await page.getByRole("link", { name: /^Next: House record/ }).click();

  await page.waitForURL("**/owner/record");
  await page.getByText("Hearthline").first().waitFor();
  await snap(page, vp, "19-owner-2-record");
  await page.getByRole("link", { name: /Add or check equipment details/ }).click();
  await page.waitForURL("**/owner/label");
  await snap(page, vp, "20-optional-label-intro");
  await page.getByRole("radio", { name: "Type the details in" }).click();
  await page.locator("#label-manufacturer").waitFor();
  await snap(page, vp, "21-optional-label-typing");
  await page.goto(`${BASE}/owner/record`);
  await page.getByRole("link", { name: /^Next: Quote check/ }).click();

  await page.waitForURL("**/owner/quote");
  await page.getByText(/Best pick/).waitFor();
  await page.getByText("Line by line").waitFor();
  await snap(page, vp, "22-owner-3-quote");
  await page.locator("label", { hasText: "Bayside Plumbing and Heating" }).click();
  await page.getByRole("heading", { name: "Bayside Plumbing and Heating" }).waitFor();
  await snap(page, vp, "23-owner-3-quote-bayside");
  await page.getByRole("button", { name: "Use a sample quote" }).click();
  await page.getByRole("heading", { name: "Harbor View Plumbing" }).waitFor();
  await snap(page, vp, "24-owner-3-quote-pasted");
  await page.getByRole("link", { name: /Next: Repair or replace/ }).click();

  await page.waitForURL("**/owner/decide");
  await page.getByText("Replace it").waitFor();
  await snap(page, vp, "25-owner-4-decide");
  await page.getByRole("link", { name: /^Next: Approve and book/ }).click();

  await page.waitForURL("**/owner/book");
  await snap(page, vp, "26-owner-5-book-plan");
  await page.getByText("A1 Rapid Plumbing").first().click();
  await page.getByText("To the vendor: A1 Rapid Plumbing").waitFor({ timeout: 8000 });
  await snap(page, vp, "27-owner-5-book-a1-selected");
  await page.getByRole("button", { name: /Approve Porchlight.s plan/ }).click();
  await page.getByText("Nothing was actually sent").waitFor();
  await snap(page, vp, "28-owner-5-booked");
  // The tenant sees the booking and confirms the time.
  await page.goto(`${BASE}/tenant/status`);
  await page.getByText(/Message from Sample Owner/).waitFor();
  await page.getByText("Visit window:").waitFor({ timeout: 8000 });
  await snap(page, vp, "29-tenant-4-status-booked");
  await page.getByRole("button", { name: "That time works" }).click();
  await page.getByText("Time confirmed").waitFor();
  await snap(page, vp, "30-tenant-4-status-confirmed");

  // The plumber finishes, and the record updates itself.
  await page.goto(`${BASE}/owner/book`);
  await page.getByRole("button", { name: "Demo: the plumber finishes the job" }).click();
  await page.getByText("House record updated automatically").waitFor();
  await snap(page, vp, "31-owner-5-record-updated-automatically");

  await page.goto(`${BASE}/owner/record`);
  await page.getByText("New, added automatically").waitFor();
  await snap(page, vp, "32-owner-2-record-after-install");

  await page.goto(`${BASE}/tenant/status`);
  await page.getByText("The new water heater is installed").waitFor();
  await snap(page, vp, "33-tenant-4-status-fixed");

  // ---------- Owner home ----------
  await page.goto(`${BASE}/owner`);
  await page.getByText("DONE").first().waitFor();
  await snap(page, vp, "34-owner-home-done");

  // ---------- Plan ahead tools ----------
  await page.getByRole("link", { name: /5-year forecast/ }).first().click();
  await page.waitForURL("**/owner/forecast");
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

  // ---------- Tenant could not reach the label ----------
  await page.goto(`${BASE}/?reset=1`);
  await page.goto(`${BASE}/tenant/request`);
  await page.getByRole("button", { name: "Submit" }).click();
  await page.getByText("Owner notified").first().waitFor({ timeout: 8000 });
  await page.goto(`${BASE}/tenant/label`);
  await page.getByRole("button", { name: "I cannot reach it" }).click();
  await page.getByText("That is okay").waitFor();
  await snap(page, vp, "39-tenant-3-label-skipped");
  await page.goto(`${BASE}/owner/record`);
  await page.getByText("not on file yet").waitFor();
  await snap(page, vp, "40-owner-2-record-missing");

  // ---------- Emergency example ----------
  await page.goto(`${BASE}/?reset=1`);
  await page.goto(`${BASE}/tenant/request`);
  await page.locator("#description").fill("I smell gas near the water heater");
  await page.getByRole("button", { name: "Submit" }).click();
  await page.getByText("Owner is being called").first().waitFor({ timeout: 8000 });
  await snap(page, vp, "41-tenant-emergency-gas");
  await page.goto(`${BASE}/owner/request`);
  await page.getByText("AI confidence").waitFor({ timeout: 8000 });
  await snap(page, vp, "42-owner-emergency-gas");
  await page.goto(`${BASE}/owner`);
  await page.getByText("Porchlight sorted a new request").waitFor();
  await snap(page, vp, "43-owner-home-emergency");

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

  for (const e of errors) {
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
