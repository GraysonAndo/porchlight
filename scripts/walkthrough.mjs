// Walks the whole demo at phone and desktop sizes, takes a screenshot of every
// screen into docs/screenshots, and checks layout on each one.
//
// Usage: BASE_URL=http://localhost:3000 node scripts/walkthrough.mjs

import { mkdirSync } from "node:fs";
import { launch, layoutProblems, watchErrors, BASE } from "./browser.mjs";

const OUT = new URL("../docs/screenshots/", import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

const VIEWPORTS = [
  { name: "mobile", width: 390, height: 844 },
  { name: "desktop", width: 1280, height: 800 },
];

let failures = 0;
const warnings = [];

async function snap(page, vp, name) {
  await page.waitForTimeout(250);
  await page.screenshot({ path: `${OUT}${name}-${vp.name}.png`, fullPage: true });
  const problems = await layoutProblems(page);
  for (const p of problems) {
    const text = `[${vp.name}] ${name}: ${p}`;
    // Small tap targets and similar are warnings. Scroll, overflow, broken images fail.
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

  // 1. Home
  await page.goto(`${BASE}/?reset=1`);
  await page.getByRole("heading", { name: "Your rental, looked after." }).waitFor();
  await snap(page, vp, "01-home");

  await page.getByRole("button", { name: /I am an owner/ }).click();
  await page.getByText("Open repair request").waitFor();
  await snap(page, vp, "02-home-owner");

  // Demo guide, open
  await page.getByRole("button", { name: /Demo guide/ }).click();
  await page.getByRole("link", { name: /Report a repair/ }).waitFor();
  await snap(page, vp, "03-demo-guide-open");
  await page.getByRole("button", { name: /Demo guide/ }).click();

  // 2. Screen 1: request
  await page.goto(`${BASE}/tenant/request`);
  await page.getByRole("button", { name: "Use sample photo" }).click();
  await page.getByAltText(/Sample photo of a water heater leaking/).waitFor();
  await snap(page, vp, "04-screen1-request");
  await page.getByRole("button", { name: "Submit" }).click();

  // 3. Screen 2: triage
  await page.waitForURL("**/triage");
  await page.getByText("Reading your request and photo").waitFor();
  await snap(page, vp, "05-screen2-triage-thinking");
  await page.getByText("Owner notified").waitFor({ timeout: 8000 });
  await snap(page, vp, "06-screen2-triage");
  await page.locator("summary", { hasText: "How to do this" }).first().click();
  await page.getByText("Stop and get help if:").first().waitFor();
  await snap(page, vp, "06b-screen2-triage-guide-open");
  await page.locator("summary", { hasText: "How to do this" }).first().click();
  await page.getByRole("link", { name: "Read the equipment label" }).click();

  // 4. Screen 3: label
  await page.waitForURL("**/label");
  await page.getByRole("button", { name: "Use sample label photo" }).click();
  await page.getByText("Reading brand, model, serial").waitFor();
  await snap(page, vp, "07-screen3-label-scanning");
  await page.getByText("Please confirm").waitFor({ timeout: 8000 });
  await snap(page, vp, "08-screen3-label-read");
  await page.getByRole("button", { name: "Looks right" }).click();
  await page.getByText("Confirmed").waitFor();
  await page.getByRole("button", { name: "Save to house record" }).click();

  // 5. Screen 4: record
  await page.waitForURL("**/record");
  await page.getByText("Hearthline").first().waitFor();
  await snap(page, vp, "09-screen4-record");
  await page.getByRole("link", { name: /^Next: Quote check/ }).click();

  // 6. Screen 5: quote
  await page.waitForURL("**/quote");
  await page.getByText("Is this quote fair?").waitFor({ timeout: 8000 });
  await snap(page, vp, "10-screen5-quote");
  await page.getByRole("link", { name: /Next: Repair or replace/ }).click();

  // 7. Screen 6: decide
  await page.waitForURL("**/decide");
  await page.getByText("Replace it").waitFor();
  await snap(page, vp, "11-screen6-decide");
  await page.getByRole("link", { name: /^Next: 5-year forecast/ }).click();

  // 8. Screen 7: forecast
  await page.waitForURL("**/forecast");
  await page.getByText("Plan to set aside each year").waitFor();
  await snap(page, vp, "12-screen7-forecast");
  await page.getByRole("link", { name: /^Next: Rent increase/ }).click();

  // 9. Screen 8: rent
  await page.waitForURL("**/rent");
  await page.getByText("OK: within the state cap").waitFor();
  await snap(page, vp, "13-screen8-rent-ok");

  await page.locator("#proposed-rent").fill("3600");
  await page.getByText(/Exceeds cap by/).waitFor();
  await snap(page, vp, "14-screen8-rent-over-cap");
  await page.locator("#proposed-rent").fill("3360");

  await page.getByLabel("The tenant was given the required written exemption notice.").check();
  await page.getByText(/May be exempt from the state cap/).waitFor();
  await snap(page, vp, "15-screen8-rent-exempt");
  await page.getByLabel("The tenant was given the required written exemption notice.").uncheck();
  await page.getByRole("link", { name: /^Next: Approve and book/ }).click();

  // 10. Screen 9: approve
  await page.waitForURL("**/approve");
  await snap(page, vp, "16-screen9-approve-start");
  await page.getByText("A1 Rapid Plumbing").first().click();
  await page.getByText("To the vendor: A1 Rapid Plumbing").waitFor({ timeout: 8000 });
  await snap(page, vp, "17-screen9-approve-a1-selected");
  await page.getByText("Willow Glen Water Heater Co.").first().click();
  await page.getByText("To the vendor: Willow Glen Water Heater Co.").waitFor({ timeout: 8000 });
  await page.getByRole("button", { name: "Approve and send" }).click();
  await page.getByText("Nothing was actually sent").waitFor();
  await snap(page, vp, "18-screen9-approved");

  // 11. Feedback sheet and notes page
  await page.getByRole("button", { name: "Leave feedback" }).click();
  await page.getByText("How clear was this screen?").waitFor();
  await page.locator("dialog").getByText("4", { exact: true }).click();
  await page.getByLabel(/What was confusing or missing/).fill("The not-to-exceed amount was clear.");
  await snap(page, vp, "19-feedback-sheet");
  await page.getByRole("button", { name: "Save feedback" }).click();
  await page.getByText(/Saved. Thank you/).waitFor();
  await page.getByRole("button", { name: "Done" }).click();

  await page.goto(`${BASE}/feedback`);
  await page.getByText("The not-to-exceed amount was clear.").first().waitFor();
  await snap(page, vp, "20-feedback-notes");

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
    console.log(`FAIL [${vp.name}] walkthrough stopped: ${err.message.split("\n")[0]}`);
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
