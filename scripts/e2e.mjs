// End to end checks for behavior (not layout): the tenant and owner flows,
// role separation, the house record, persistence, Reset demo, ?reset=1,
// blocked localStorage, feedback notes, safety guides, and old links.
//
// Usage: BASE_URL=http://localhost:3000 node scripts/e2e.mjs

import { launch, watchErrors, BASE } from "./browser.mjs";

let failed = 0;
function check(name, ok, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${ok ? "" : ` ${detail}`}`);
  if (!ok) failed++;
}

const browser = await launch();

async function newPage(options = {}) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    permissions: ["clipboard-read", "clipboard-write"],
    ...options,
  });
  const page = await context.newPage();
  const errors = [];
  watchErrors(page, errors);
  return { context, page, errors };
}

const count = async (page, text) => page.getByText(text).count();

// ======================= Role separation =======================
{
  const { context, page, errors } = await newPage();
  await page.goto(`${BASE}/?reset=1`);
  await page.waitForFunction(() => !window.location.search.includes("reset=1"));
  check("?reset=1 is removed from the URL", !page.url().includes("reset=1"), page.url());
  check("home explains who is who", (await count(page, "Who is who")) > 0);
  check("home says the owner decides and pays", (await page.getByText(/Does not choose or pay for the repair/).count()) > 0);

  await page.getByRole("button", { name: /I am a tenant/ }).click();
  await page.waitForURL("**/tenant/request");
  check("header says Tenant view", (await count(page, "Tenant view")) > 0);
  await page.getByRole("button", { name: "Use sample photo" }).click();
  await page.getByRole("button", { name: "Submit" }).click();
  await page.waitForURL("**/tenant/safety");
  await page.getByText("Owner notified").first().waitFor({ timeout: 8000 });

  // A tenant must not see owner decisions or internal AI detail.
  const tenantText = await page.locator("main").innerText();
  for (const word of ["AI confidence", "Likely cause", "Quote check", "Repair or replace", "5-year forecast", "Rent increase", "house record is", "Approve and book", "Willow Glen", "$2,450", "$2,850", "Saves you"]) {
    check(`tenant safety screen has no "${word}"`, !tenantText.includes(word), "found in tenant text");
  }
  check("tenant is told the owner arranges and pays", (await page.getByText(/arranges and pays for the repair/).count()) > 0);
  check("tenant is told they do not need to call a plumber", (await page.getByText(/You do not need to call a plumber/).count()) > 0);

  // The tenant is asked for one label photo, with no prices or owner decisions.
  await page.getByRole("link", { name: /Next: One quick photo/ }).click();
  await page.waitForURL("**/tenant/label");
  const labelText = await page.locator("main").innerText();
  for (const word of ["Quote check", "Willow Glen", "$2,450", "Approve"]) {
    check(`tenant label screen has no "${word}"`, !labelText.includes(word));
  }
  check("tenant label screen explains why it asks", (await count(page, "Why Porchlight is asking")) > 0);

  // Tenant status page has no owner tools either.
  await page.getByRole("link", { name: "See request status" }).click();
  await page.waitForURL("**/tenant/status");
  const statusText = await page.locator("main").innerText();
  for (const word of ["Quote check", "AI confidence", "Repair or replace"]) {
    check(`tenant status has no "${word}"`, !statusText.includes(word));
  }
  check("tenant status shows the owner is choosing a plumber", (await count(page, "Owner choosing a plumber")) > 0);
  check("tenant status waits for the label photo", (await count(page, "Waiting for your label photo")) > 0);

  // Owner side is labeled and separate.
  await page.goto(`${BASE}/owner`);
  check("owner header says Owner view", (await count(page, "Owner view")) > 0);
  check("owner home lists the tenant's request", (await count(page, "New repair request")) > 0);

  check("no console errors in role separation", errors.length === 0, errors.join(" | "));
  await context.close();
}

// ======================= Full story: tenant, owner, record, tenant =======================
{
  const { context, page, errors } = await newPage();
  await page.goto(`${BASE}/?reset=1`);
  await page.getByRole("button", { name: /I am a tenant/ }).click();
  await page.waitForURL("**/tenant/request");
  await page.getByRole("button", { name: "Use sample photo" }).click();
  await page.getByRole("button", { name: "Submit" }).click();
  await page.waitForURL("**/tenant/safety");
  await page.getByText("URGENT").first().waitFor({ timeout: 8000 });

  // Tenant answers the questions, and it survives a reload.
  await page.locator("#answer-0").fill("A slow drip");
  await page.locator("#answer-2").fill("No gas smell");
  await page.getByRole("button", { name: "Send my answers" }).click();
  await page.getByText(/Answers sent to Sample Owner/).waitFor();
  await page.reload();
  await page.getByText(/Answers sent to Sample Owner/).waitFor({ timeout: 8000 });
  check("tenant answers survive a reload", true);

  // Before the label photo, the owner sees the record is missing.
  await page.goto(`${BASE}/owner/record`);
  await page.getByText("not on file yet").waitFor();
  check("record starts without brand, model, or serial", (await count(page, "HL-40G-NG")) === 0);
  check("record says the tenant was asked for a photo", (await page.getByText(/asked Sample Tenant for a photo/).count()) > 0);

  // Tenant sends the label photo.
  await page.goto(`${BASE}/tenant/label`);
  await page.getByRole("button", { name: "Use sample label photo" }).click();
  await page.locator("#label-serial").waitFor({ timeout: 8000 });
  check("tenant does not see a comparison with the record", (await page.getByText("Matches the record").count()) === 0);
  await page.getByRole("button", { name: "Looks right" }).click();
  await page.getByRole("button", { name: "Send to Porchlight" }).click();
  await page.getByText("Porchlight has what it needs").waitFor();
  check("tenant label saves to the record", true);
  await page.reload();
  await page.getByText("Porchlight has what it needs").waitFor({ timeout: 8000 });
  check("tenant label survives a reload", true);

  // Owner reviews the request and sees the tenant's answers.
  await page.goto(`${BASE}/owner/request`);
  await page.getByText("AI confidence").waitFor({ timeout: 8000 });
  check("owner sees the agent log", (await count(page, "What Porchlight already did")) > 0 && (await count(page, "read_label")) > 0);
  check("owner sees the tenant's report", (await count(page, "New request from Sample Tenant")) > 0);
  check("owner sees the likely cause", (await count(page, "Likely cause")) > 0);
  check("owner sees the tenant's answers", (await count(page, "A slow drip")) > 0 && (await count(page, "No gas smell")) > 0);
  check("owner sees the heater read from the tenant's photo", (await page.getByText(/Water heater: Hearthline HL-40G-NG/).count()) > 0);
  check("owner sees what the tenant was told", (await count(page, "What the tenant was told to do")) > 0);
  check("owner has no safety checkboxes to tick", (await page.locator('main input[type="checkbox"]').count()) === 0);

  // House record already knows the heater.
  await page.getByRole("link", { name: /^Next: House record/ }).click();
  await page.waitForURL("**/owner/record");
  await page.getByText("Hearthline").first().waitFor();
  check("record already has the model", (await count(page, "HL-40G-NG")) > 0);
  check("record already has the serial number", (await count(page, "15C0412-X")) > 0);
  check("record says it came from the tenant's photo", (await page.getByText(/label photo sent by the tenant/).count()) > 0);
  check("record says nothing had to be typed", (await count(page, "You do not have to type any of this")) > 0);
  check("record does not ask for a label to be read", (await page.getByRole("button", { name: "Use sample label photo" }).count()) === 0);

  // Optional label tool compares with the record.
  await page.getByRole("link", { name: /Add or check equipment details/ }).click();
  await page.waitForURL("**/owner/label");
  check("label tool says you usually will not need it", (await count(page, "You usually will not need this screen")) > 0);
  check("label tool says the record builds itself", (await page.getByText(/Porchlight builds the house record for you/).count()) > 0);
  await page.getByRole("button", { name: "Use sample label photo" }).click();
  await page.locator("#label-serial").waitFor({ timeout: 8000 });
  check("label tool compares with the record", (await page.getByText("Matches the record").count()) >= 5);
  check("label tool confirms everything matches", (await count(page, "Everything matches the house record")) > 0);
  await page.locator("#label-serial").fill("15C0412-Y");
  await page.getByText("Different from the record").first().waitFor();
  check("label tool flags an edited field as different", (await page.getByText(/The record says: 15C0412-X/).count()) > 0);
  await page.getByRole("button", { name: "Save to the house record" }).click();
  await page.waitForURL("**/owner/record");
  await page.getByText("15C0412-Y").waitFor();
  check("record shows it was checked against a label", (await count(page, "Checked against a label")) > 0);
  await page.reload();
  await page.getByText("15C0412-Y").waitFor();
  check("checked record survives a reload", true);

  // Forecast, quote, decide.
  await page.goto(`${BASE}/owner/forecast`);
  await page.getByText("overdue or due now").first().waitFor();
  check("forecast marks the water heater overdue", true);
  await page.goto(`${BASE}/owner/quote`);
  await page.getByText(/Best pick/).waitFor({ timeout: 8000 });
  check("quote screen picks Willow Glen at $2,450", (await page.getByText(/Best pick:.*Willow Glen.*\$2,450/).count()) > 0);
  check("quote screen shows the $400 saving", (await page.getByText(/\$400 less/).count()) > 0);
  check("Bayside is slightly high", (await page.locator("label", { hasText: "Bayside" }).getByText("Slightly high").count()) > 0);
  check("A1 is skipped for a missing license", (await page.getByText(/A1 Rapid Plumbing:.*No license number is shown/).count()) > 0);
  check("A1 has no permit line noted", (await page.getByText(/Not listed: a permit/).count()) > 0);
  check("quote screen says plain code, not AI", (await count(page, "Plain code, not AI.")) > 0);
  await page.locator("label", { hasText: "Bayside" }).click();
  await page.getByRole("heading", { name: "Bayside Plumbing and Heating" }).waitFor();
  check("selecting Bayside shows its verdict", (await page.getByText(/above the top of the typical range/).count()) > 0);

  // Paste a quote.
  await page.getByRole("button", { name: "Use a sample quote" }).click();
  await page.getByRole("heading", { name: "Harbor View Plumbing" }).waitFor();
  check("pasted sample quote reads 7 lines and a $3,170 total", (await page.getByText("$3,170").count()) > 0);
  check("pasted quote is rated high", (await page.getByText(/about 22% above the top/).count()) > 0);
  await page.locator("#paste-quote").fill("Nothing here to read");
  await page.getByRole("button", { name: "Check this quote" }).click();
  await page.getByText("I could not find any dollar amounts").waitFor();
  check("pasting text with no prices explains what to do", true);
  await page.locator("#paste-quote").fill("Cheap Co\nWater heater ..... $500\nLabor ..... $300\nTotal $900");
  await page.getByRole("button", { name: "Check this quote" }).click();
  await page.getByText(/lines add up to \$800/).waitFor();
  check("a quote whose lines do not add up is flagged", true);
  await page.goto(`${BASE}/owner/decide`);
  await page.getByText("Replace it").waitFor();
  check("decision is replace, with the real numbers", (await count(page, "110%")) > 0);

  // Rent math.
  await page.goto(`${BASE}/owner/rent`);
  await page.getByText("$3,456.00").first().waitFor();
  check("rent shows max new rent $3,456.00", true);
  check("rent shows 8.0% cap", (await count(page, "8.0%")) > 0);
  check("rent shows 30 day notice at 5%", (await count(page, "30 days")) > 0);
  await page.locator("#proposed-rent").fill("3552");
  await page.getByText("90 days").first().waitFor();
  check("rent shows 90 day notice at 11%", true);
  check("legal callout is present", (await page.getByText(/San Jose rent ordinances/).count()) > 0);
  check("draft, not legal advice is next to the result", (await count(page, "Draft, not legal advice")) >= 2);
  await page.getByRole("button", { name: "Copy notice" }).click();
  await page.getByText(/Copied to your clipboard/).waitFor();
  const clip = await page.evaluate(() => navigator.clipboard.readText());
  check("copied notice is stamped as a draft", clip.startsWith("DRAFT, NOT LEGAL ADVICE"));

  // Book with one tap.
  await page.goto(`${BASE}/owner/book`);
  check("book screen shows the plan: $2,450, limit $2,695, saves $400", (await count(page, "$2,695")) > 0 && (await count(page, "$400")) > 0);
  await page.getByRole("button", { name: /Approve Porchlight.s plan/ }).click();
  await page.getByText("Vendor notified").waitFor();
  check("one tap approves Willow Glen with a $2,695 limit", (await page.getByText(/Willow Glen Water Heater Co\./).count()) > 0 && (await count(page, "$2,695")) > 0);
  check("booking shows what Porchlight did after the tap", (await count(page, "What Porchlight did after your tap")) > 0);
  await page.getByText("Tenant notified").waitFor();
  await page.getByText("Visit scheduled").waitFor();
  check("confirmation says nothing was sent", (await count(page, "Nothing was actually sent")) > 0);
  check("booking explains what the tenant sees", (await count(page, "What the tenant sees")) > 0);
  check("booking explains the record updates itself", (await page.getByText(/go into your\s+house record/).count()) > 0);

  // Tenant sees the booking and confirms the time.
  await page.goto(`${BASE}/tenant/status`);
  await page.getByText(/Message from Sample Owner/).waitFor();
  await page.getByText("Visit window:").waitFor({ timeout: 8000 });
  check("tenant sees who is coming and when", (await page.getByText(/Willow Glen Water Heater Co\., Tomorrow/).count()) > 0);
  await page.getByRole("button", { name: "That time works" }).click();
  await page.getByText("Time confirmed").waitFor();
  check("tenant can confirm the time", true);

  // Owner home reflects it.
  await page.goto(`${BASE}/owner`);
  await page.getByText("BOOKED").first().waitFor();
  check("owner home shows BOOKED", true);
  check("owner home shows the tenant confirmed the time", (await count(page, "Tenant confirmed the time")) > 0);
  check("owner home shows the tenant answered", (await count(page, "Tenant answered the questions")) > 0);

  // The plumber finishes: the record updates itself.
  await page.goto(`${BASE}/owner/book`);
  await page.getByRole("button", { name: "Demo: the plumber finishes the job" }).click();
  await page.getByText("House record updated automatically").waitFor();
  await page.goto(`${BASE}/owner/record`);
  await page.getByText("New, added automatically").waitFor();
  check("record shows the new heater", (await count(page, "26J0007-A")) > 0);
  check("record keeps history of the replaced heater", (await page.getByText(/was\s+replaced/).count()) > 0);
  await page.goto(`${BASE}/owner/forecast`);
  await page.getByText("beyond 5 years").first().waitFor();
  check("forecast no longer has the water heater overdue", (await page.getByText("overdue or due now").count()) === 0);
  await page.goto(`${BASE}/tenant/status`);
  await page.getByText("The new water heater is installed").waitFor();
  check("tenant status shows fixed", true);
  await page.goto(`${BASE}/owner`);
  await page.getByText("DONE").first().waitFor();
  check("owner home shows DONE", true);

  // Reset demo from the footer.
  await page.getByRole("button", { name: "Reset demo" }).click();
  await page.waitForURL(`${BASE}/`);
  await page.goto(`${BASE}/owner/record`);
  await page.getByText("not on file yet").waitFor();
  check("Reset demo clears the heater record", (await count(page, "15C0412-Y")) === 0);
  await page.goto(`${BASE}/owner/book`);
  await page.getByText("1. Pick a vendor").waitFor();
  check("Reset demo clears the booking", true);
  await page.goto(`${BASE}/tenant/status`);
  await page.getByText("Owner choosing a plumber").waitFor();
  check("Reset demo clears the tenant status", (await count(page, "Visit window:")) === 0);

  check("no console errors in the full story", errors.length === 0, errors.join(" | "));
  await context.close();
}

// ======================= Skipped label, typed entry =======================
{
  const { context, page, errors } = await newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto(`${BASE}/?reset=1`);
  await page.goto(`${BASE}/tenant/request`);
  await page.getByRole("button", { name: "Submit" }).click();
  await page.getByText("Owner notified").first().waitFor({ timeout: 8000 });
  await page.goto(`${BASE}/tenant/label`);
  await page.getByRole("button", { name: "I cannot reach it" }).click();
  await page.getByText("That is okay").waitFor();
  await page.goto(`${BASE}/owner/request`);
  await page.getByText("AI confidence").waitFor({ timeout: 8000 });
  check("owner is told the tenant could not reach the label", (await page.getByText(/could not reach the label/).count()) > 0);
  await page.goto(`${BASE}/owner/label`);
  await page.getByRole("radio", { name: "Type the details in" }).click();
  const save = page.getByRole("button", { name: "Save to the house record" });
  check("typed entry cannot be saved while empty", await save.isDisabled());
  await page.locator("#label-manufacturer").fill("Acme");
  await page.locator("#label-model").fill("AC-50");
  await page.locator("#label-serial").fill("S123");
  await page.locator("#label-capacityGallons").fill("50");
  await page.locator("#label-manufactureDate").fill("2018-06");
  await save.click();
  await page.waitForURL("**/owner/record");
  await page.getByText("Acme").first().waitFor();
  check("typed details are saved and marked as typed by the owner", (await page.getByText("Typed in by the owner").count()) > 0);
  check("typed record does not claim to be checked against a label", (await count(page, "Checked against a label")) === 0);
  check("no console errors in the skipped label flow", errors.length === 0, errors.join(" | "));
  await context.close();
}

// ======================= Watch it work =======================
{
  const { context, page, errors } = await newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto(`${BASE}/?reset=1`);
  await page.getByRole("link", { name: /Watch Porchlight work/ }).first().click();
  await page.waitForURL("**/live");
  const next = page.getByRole("button", { name: "Next step" });
  const back = page.getByRole("button", { name: "Back one step" });
  check("watch it work starts with Back disabled", await back.isDisabled());
  await next.click();
  check("Next moves the story forward", (await count(page, "Step 2 of")) > 0);
  await page.getByRole("button", { name: "Play" }).click();
  await page.getByText(/Step [3-9] of/).waitFor({ timeout: 15000 });
  check("Play advances by itself", true);
  await page.getByRole("button", { name: "Pause" }).click();
  while (await next.isEnabled()) await next.click();
  await page.getByText("Owner taps needed").waitFor();
  check("the story ends with stats: one owner tap", (await page.getByText("Owner taps needed").count()) > 0);
  check("the story shows $400 saved", (await page.getByText("$400").count()) > 0);
  const tenantText = await page.locator('[aria-label="Tenant\'s phone"]').innerText();
  for (const word of ["$2,450", "$2,850", "$2,695", "quote"]) {
    check(`tenant phone never shows "${word}"`, !tenantText.includes(word), "found in tenant phone");
  }
  await page.getByRole("radio", { name: /gas/i }).click();
  while (await next.isEnabled()) await next.click();
  check("gas story shows no money spent", (await page.getByText("$0").count()) > 0);
  await page.getByRole("button", { name: "Restart" }).click();
  check("Restart goes back to the beginning", (await count(page, "Step 1 of")) > 0);
  check("no console errors on Watch it work", errors.length === 0, errors.join(" | "));
  await context.close();
}

// ======================= SMS console: the three agents =======================
{
  const { context, page, errors } = await newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto(`${BASE}/sms`);
  await page.getByLabel("Faster").check();
  const tenant = page.locator('[aria-label="Tenant\'s phone"]');
  const owner = page.locator('[aria-label="Owner\'s phone"]');
  const wait = { timeout: 20000 };

  // Loop 1: the 4 AM triage and dispatch.
  await page.getByRole("button", { name: "Water heater leak" }).click();
  await tenant.getByText(/near an outlet/).waitFor(wait);
  check("tenant text starts the triage with a safety question", true);
  await tenant.getByRole("button", { name: /^2\s+No$/ }).click();
  await tenant.getByText(/Two quick steps/).waitFor(wait);
  await owner.getByText(/Delivered silently/).first().waitFor(wait);
  check("owner gets a silent heads-up, not a call", (await owner.getByText("Incoming call from Porchlight").count()) === 0);
  await tenant.getByRole("button", { name: "Done" }).click();
  await tenant.getByText(/silver sticker/).waitFor(wait);
  await tenant.getByRole("button", { name: "Send a photo" }).click();
  await tenant.getByRole("button", { name: "Blurry photo" }).click();
  await tenant.getByText(/too blurry/).waitFor(wait);
  check("a blurry label photo is not written to the record", (await page.getByRole("region", { name: "Water heater" }).getByText("Not on file").count()) >= 3);
  await tenant.getByRole("button", { name: "Send a photo" }).click();
  await tenant.getByRole("button", { name: "Label photo" }).click();
  await tenant.getByText(/Is it 15C0412-X/).waitFor(wait);
  await page.getByRole("region", { name: "Water heater" }).getByText("Hearthline").waitFor(wait);
  check("the label photo fills the house record", (await page.getByRole("region", { name: "Water heater" }).getByText("HL-40G-NG").count()) > 0);
  await tenant.getByRole("button", { name: "Y", exact: true }).click();
  await tenant.getByText(/I'm watching this/).waitFor(wait);
  const tenantText = await tenant.innerText();
  check("the tenant never sees a price", !/\$|quote/i.test(tenantText), tenantText.slice(0, 80));

  await page.getByRole("button", { name: /Skip ahead .*vendor quotes arrive/ }).click();
  await owner.getByText(/DECISION NEEDED: replace/).waitFor(wait);
  const card = await owner.innerText();
  check("owner decision card: pick, limit, saving", card.includes("$2,450") && card.includes("$2,695") && card.includes("$400"));
  check("owner decision card skips A1 for no license", /A1 Rapid\s+\$2,100.*no license shown/.test(card));
  check("nothing is booked before the tap", (await page.getByText("Booked Willow Glen").count()) === 0);
  await owner.getByRole("button", { name: "Approve", exact: true }).click();
  await owner.getByText(/Approved. Booked/).waitFor(wait);
  check("one tap books the plumber", true);
  await tenant.getByText(/Your plumber is Willow Glen/).waitFor(wait);
  check("the tenant is told who is coming and when", true);
  check("the approval gate is in the log", (await page.getByText("Owner tapped Approve").count()) > 0);
  await tenant.getByRole("button", { name: /^1\s+That works$/ }).click();
  await page.getByRole("button", { name: /Skip ahead .*plumber finishes/ }).click();
  await page.getByRole("region", { name: "Water heater" }).getByText("26J0007-A").waitFor(wait);
  check("the installer writes the new heater to the record by itself", (await page.getByText("Brand new").count()) > 0);

  // Loop 2: the quote audit.
  await page.getByRole("button", { name: "Contractor emails a quote" }).click();
  await owner.getByText(/22% above the top/).waitFor(wait);
  check("the quote audit flags the labor rate", (await owner.getByText(/\$230 an hour/).count()) > 0);
  check("nothing goes to the contractor before the thumbs-up", (await page.getByText("From Porchlight, approved by the owner").count()) === 1);
  await owner.getByRole("button", { name: /Send it/ }).click();
  await page.getByText("From Porchlight, approved by the owner").nth(1).waitFor(wait);
  check("the thumbs-up sends the drafted pushback", true);
  await page.getByRole("button", { name: "Contractor counters at $2,550" }).click();
  await owner.getByText(/inside the typical range/).waitFor(wait);
  await owner.getByRole("button", { name: /Accept/ }).click();
  await owner.getByText(/Accepted at \$2,550/).waitFor(wait);
  check("a fair counter can be accepted in one tap", true);

  // Loop 3: the compliance sentinel.
  await page.getByRole("button", { name: "Run the Monday lease check" }).click();
  await owner.getByText(/\$3,456\.00/).first().waitFor(wait);
  const lease = await owner.innerText();
  check("sentinel texts the exact legal maximum", lease.includes("8.0%") && lease.includes("$3,456.00"));
  check("sentinel says draft, not legal advice", lease.includes("DRAFT, NOT LEGAL ADVICE"));
  await owner.getByRole("button", { name: /Mail at max/ }).click();
  await owner.getByText(/Notice mailed certified/).waitFor(wait);
  check("the notice is mailed, not texted", (await page.getByText("Mailed the notice by certified mail").count()) > 0);
  await page.getByRole("button", { name: /Skip ahead .*notice is delivered/ }).click();
  await owner.getByText(/Proof of service is saved/).waitFor(wait);
  check("proof of service lands in the house record", (await page.getByText(/Delivered .*proof saved/).count()) > 0);
  check("four owner taps and $400 saved on the scoreboard", (await page.getByLabel("Scoreboard").innerText()).includes("4 owner taps") && (await page.getByLabel("Scoreboard").innerText()).includes("$400 saved"));
  check("no console errors in the SMS console", errors.length === 0, errors.join(" | "));
  await context.close();
}

{
  // Emergencies: the gas smell, typed by hand as the owner, and the sleepy owner.
  const { context, page, errors } = await newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto(`${BASE}/sms`);
  await page.getByLabel("Faster").check();
  const tenant = page.locator('[aria-label="Tenant\'s phone"]');
  const owner = page.locator('[aria-label="Owner\'s phone"]');
  const wait = { timeout: 20000 };
  await page.getByRole("button", { name: "I smell gas" }).click();
  await tenant.getByText(/911/).first().waitFor(wait);
  await owner.getByText("Incoming call from Porchlight").waitFor(wait);
  check("a gas smell calls the owner through Do Not Disturb", true);
  await owner.getByText(/EMERGENCY at/).waitFor(wait);
  check("a gas smell gives the tenant no photo request and starts no quotes", (await page.getByText("request_quotes").count()) === 0 && (await tenant.getByText(/silver sticker/).count()) === 0);
  await owner.getByRole("button", { name: "I'm on it" }).click();
  await tenant.getByText(/Your landlord is on it/).first().waitFor(wait);
  check("the owner's acknowledgement is relayed to the tenant", true);
  check("emergency scoreboard has a skip-fix-steps entry", (await page.getByText("skip_fix_steps").count()) > 0);

  await page.getByRole("button", { name: "Start over" }).click();
  await page.getByRole("button", { name: "Water heater leak" }).click();
  await tenant.getByText(/near an outlet/).waitFor(wait);
  await tenant.getByRole("button", { name: /^1\s+Yes$/ }).click();
  await owner.getByText("Incoming call from Porchlight").waitFor(wait);
  check("water near an outlet is treated as an emergency", true);

  await page.getByRole("button", { name: "Start over" }).click();
  await page.getByRole("button", { name: "Water heater leak" }).click();
  await tenant.getByRole("button", { name: /^2\s+No$/ }).click();
  await tenant.getByRole("button", { name: "Done" }).click();
  await tenant.getByRole("button", { name: "Send a photo" }).click();
  await tenant.getByRole("button", { name: "Label photo" }).click();
  await tenant.getByRole("button", { name: "Y", exact: true }).click();
  await page.getByRole("button", { name: /Skip ahead .*vendor quotes arrive/ }).click();
  await owner.getByText(/DECISION NEEDED/).waitFor(wait);
  await page.getByRole("button", { name: "Owner stays asleep (+45 min)" }).click();
  await owner.getByText(/Reminder: the water heater decision/).waitFor(wait);
  await owner.getByText("Incoming call from Porchlight").waitFor(wait);
  check("a silent owner gets a reminder text and a call after 45 minutes", true);
  await owner.getByLabel("Reply to Porchlight").fill("1");
  await owner.getByRole("button", { name: "Send", exact: true }).click();
  await owner.getByText(/Approved. Booked/).waitFor(wait);
  check("typing 1 approves the same as tapping", true);
  check("no console errors in the emergency checks", errors.length === 0, errors.join(" | "));
  await context.close();
}

{
  // The autopilot plays the whole thing, on a phone.
  const { context, page, errors } = await newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(`${BASE}/sms`);
  await page.getByLabel("Faster").check();
  await page.getByRole("button", { name: /Play the full demo/ }).click();
  await page.getByRole("tab", { name: "Owner" }).click();
  await page.getByText(/Proof of service is saved/).waitFor({ timeout: 90000 });
  check("the autopilot finishes all three loops on a phone", true);
  await page.getByRole("tab", { name: "Agent" }).click();
  await page.getByText("Wrote to the house record").first().waitFor();
  check("the agent tab shows the log and the house record", (await page.getByText("26J0007-A").count()) > 0);
  await page.getByRole("tab", { name: "Vendor" }).click();
  await page.getByText("From the contractor").first().waitFor();
  check("the vendor tab shows the contractor's inbox", true);
  check("no console errors on the phone", errors.length === 0, errors.join(" | "));
  await context.close();
}

// ======================= Old links still work =======================
{
  const { context, page } = await newPage();
  const redirects = [
    ["/triage", "/tenant/safety"],
    ["/label", "/owner/label"],
    ["/record", "/owner/record"],
    ["/quote", "/owner/quote"],
    ["/decide", "/owner/decide"],
    ["/approve", "/owner/book"],
    ["/forecast", "/owner/forecast"],
    ["/rent", "/owner/rent"],
  ];
  for (const [from, to] of redirects) {
    await page.goto(`${BASE}${from}`);
    check(`old link ${from} goes to ${to}`, new URL(page.url()).pathname === to, page.url());
  }
  await context.close();
}

// ======================= Feedback =======================
{
  const { context, page, errors } = await newPage();
  await page.goto(`${BASE}/?reset=1`);
  await page.goto(`${BASE}/owner/quote`);
  await page.getByRole("button", { name: "Leave feedback" }).click();
  await page.getByRole("button", { name: "Save feedback" }).click();
  check("rating is required", (await count(page, "Please pick a rating")) > 0);
  await page.locator("dialog").getByText("5", { exact: true }).click();
  await page.getByLabel(/What was confusing/).fill("Clear. I would ask for the labor hours.");
  await page.getByRole("button", { name: "Save feedback" }).click();
  await page.getByText(/Saved. Thank you/).waitFor();
  await page.getByRole("button", { name: "Done" }).click();

  await page.goto(`${BASE}/feedback`);
  await page.getByText("Owner, screen 3 of 5: Quote check").first().waitFor();
  check("feedback note names the role and screen", true);
  await page.getByRole("button", { name: "Copy all as text" }).click();
  await page.getByText(/Copied to your clipboard/).waitFor();
  const text = await page.evaluate(() => navigator.clipboard.readText());
  check("copied text is readable", text.includes("Clarity rating: 5 of 5") && text.includes("labor hours"), text);
  await page.getByRole("button", { name: "Clear all" }).click();
  await page.getByRole("button", { name: /Yes, delete all 1 notes/ }).click();
  await page.getByText("No notes yet.").waitFor();
  check("Clear all removes the notes", true);

  await page.getByRole("button", { name: "Leave feedback" }).click();
  await page.locator("dialog").getByText("3", { exact: true }).click();
  await page.getByRole("button", { name: "Save feedback" }).click();
  await page.getByRole("button", { name: "Done" }).click();
  await page.getByText("1. Feedback notes", { exact: true }).waitFor();
  await page.goto(`${BASE}/feedback?reset=1`);
  await page.waitForFunction(() => !window.location.search.includes("reset=1"));
  await page.getByText("No notes yet.").waitFor();
  check("?reset=1 clears saved state", true);
  check("no console errors on feedback", errors.length === 0, errors.join(" | "));
  await context.close();
}

// ======================= localStorage blocked =======================
{
  const { context, page, errors } = await newPage();
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new DOMException("blocked", "SecurityError");
      },
    });
  });
  await page.goto(`${BASE}/tenant/request`);
  await page.getByRole("button", { name: "Submit" }).click();
  await page.waitForURL("**/tenant/safety");
  await page.getByText("Owner notified").first().waitFor({ timeout: 8000 });
  check("app works with localStorage blocked", true);
  await page.getByRole("button", { name: "Leave feedback" }).click();
  await page.locator("dialog").getByText("4", { exact: true }).click();
  await page.getByRole("button", { name: "Save feedback" }).click();
  await page.getByText(/Saved. Thank you/).waitFor();
  check("feedback still saves in memory with storage blocked", true);
  check("no uncaught errors with storage blocked", errors.length === 0, errors.join(" | "));
  await context.close();
}

// ======================= Triage safety, approve limit, order, spacing =======================
{
  const { context, page, errors } = await newPage({ viewport: { width: 1280, height: 800 } });
  async function report(text) {
    await page.goto(`${BASE}/?reset=1`);
    await page.goto(`${BASE}/tenant/request`);
    await page.locator("#description").fill(text);
    await page.getByRole("button", { name: "Submit" }).click();
    await page.waitForURL("**/tenant/safety");
    await page.getByText(/Owner notified|Owner is being called/).first().waitFor({ timeout: 8000 });
  }

  await report("I smell gas near the water heater");
  check("gas smell is an EMERGENCY", (await count(page, "EMERGENCY")) > 0);
  check("gas smell tells the tenant to leave the home", (await count(page, "Leave the home now")) > 0);
  check("gas smell tells the tenant to call 911 or the gas company", (await page.getByText(/911 or your gas company/).count()) > 0);
  check("gas smell calls the owner right now", (await count(page, "Owner is being called")) > 0);
  await page.getByRole("link", { name: /Next: One quick photo/ }).click();
  await page.getByText("No photo needed this time").waitFor();
  check("a gas emergency does not ask the tenant for a photo", true);
  await page.goto(`${BASE}/owner`);
  await page.getByText(/called you, because it cannot wait/).waitFor();
  check("owner home says the owner was called", true);
  await page.goto(`${BASE}/owner/request`);
  await page.getByText("AI confidence").waitFor({ timeout: 8000 });
  check("owner sees the emergency too", (await count(page, "EMERGENCY")) > 0);

  await report("The toilet is clogged");
  check("a clogged toilet is not the water heater result", (await page.getByText(/tank/i).count()) === 0);
  check("a clogged toilet is routine", (await count(page, "ROUTINE")) > 0);

  await report("We have no heat and it is freezing");
  check("no heat gives no fix steps", (await page.getByText(/nothing for you to fix/i).count()) > 0);
  check("no heat calls the owner", (await count(page, "Owner is being called")) > 0);

  // Approve limit
  await page.goto(`${BASE}/?reset=1`);
  await page.goto(`${BASE}/owner/book`);
  await page.locator("label", { hasText: "Willow Glen" }).click();
  await page.getByText("To the tenant: Sample Tenant").waitFor({ timeout: 8000 });
  check("default not-to-exceed is valid", await page.locator("#nte").evaluate((el) => el.checkValidity()));
  await page.locator("#nte").fill("1000");
  check("a limit below the quote shows an error", (await page.getByText(/cannot be lower than the quote/).count()) > 0);
  check("a limit below the quote disables Approve and send", await page.getByRole("button", { name: "Approve and send" }).isDisabled());
  await page.locator("#nte").fill("2700");
  await page.getByText("To the tenant: Sample Tenant").waitFor({ timeout: 8000 });
  check("a whole-dollar limit is valid", await page.locator("#nte").evaluate((el) => el.checkValidity()));

  // Forecast order
  await page.goto(`${BASE}/owner/forecast`);
  const order = await page.locator("tbody th[scope=row]").allInnerTexts();
  check("forecast is sorted soonest first", order.join(",") === "Water heater,Air conditioner,Dishwasher,Furnace,Refrigerator,Roof", order.join(","));

  // Text spacing on visible text
  for (const path of ["/owner/record", "/owner/forecast", "/owner/rent", "/owner/decide", "/owner/quote", "/tenant/status"]) {
    await page.goto(`${BASE}${path}`);
    await page.waitForTimeout(1500);
    const bad = await page.evaluate((pagePath) => {
      const hits = [];
      for (const el of Array.from(document.body.querySelectorAll("p, li, dd, dt, td, th, span, h1, h2, h3"))) {
        const t = (el.textContent || "").trim();
        const m = t.match(/[A-Za-z]:\d|[a-z]\d{4}[a-z]|of\d\.\d|\$[\d,.]+per|\d[A-Za-z]{3,}(?=\s|$)/);
        if (m && !/^\d+(st|nd|rd|th)$/.test(m[0])) hits.push(`${pagePath}: "${t.slice(0, 50)}"`);
      }
      return hits.slice(0, 3);
    }, path);
    check(`no words glued to numbers on ${path}`, bad.length === 0, bad.join(" | "));
  }
  check("no console errors in the QA checks", errors.length === 0, errors.join(" | "));
  await context.close();
}

// ======================= Safety guides =======================
{
  const { context, page, errors } = await newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(`${BASE}/?reset=1`);
  await page.goto(`${BASE}/tenant/request`);
  await page.getByRole("button", { name: "Submit" }).click();
  await page.waitForURL("**/tenant/safety");
  await page.getByText("Owner notified").first().waitFor({ timeout: 8000 });
  check("tenant safety explains the guides", (await count(page, "How to do this")) > 0);
  check("tenant sees the agent log", (await count(page, "See what Porchlight did with your report")) > 0);
  const summaries = page.locator("summary", { hasText: "How to do this" });
  check("each safety step has a guide", (await summaries.count()) === 4, String(await summaries.count()));
  await summaries.nth(0).click();
  await page.getByText(/Turn off the water to the water heater/).waitFor();
  check("water guide shows the valve diagram labels", (await count(page, "Handle lines up with the pipe")) > 0);
  check("water guide has a stop-and-get-help list", (await count(page, "Stop and get help if:")) > 0);
  await summaries.nth(1).click();
  await page.getByText(/Turn the gas to the water heater to pilot or off/).waitFor();
  check("gas guide says not to relight the pilot", (await page.getByText(/Do not try to relight the pilot/).count()) > 0);

  // Guides follow the record: an electric heater gets breaker steps.
  await page.goto(`${BASE}/?reset=1`);
  await page.goto(`${BASE}/owner/label`);
  await page.getByRole("button", { name: "Use sample label photo" }).click();
  await page.locator("#label-serial").waitFor({ timeout: 8000 });
  await page.locator("#label-fuelType").selectOption("Electric");
  await page.getByRole("button", { name: "Save to the house record" }).click();
  await page.waitForURL("**/owner/record");
  await page.goto(`${BASE}/tenant/safety`);
  await page.getByText("Owner notified").first().waitFor({ timeout: 8000 });
  await page.locator("summary", { hasText: "How to do this" }).nth(1).click();
  await page.getByText("Turn off the power to the water heater").waitFor();
  check("electric heater gets breaker steps instead of a gas knob", (await page.getByText(/WATER HEATER\. It is often a wide switch/).count()) > 0);

  // Gas emergency guides.
  await page.goto(`${BASE}/?reset=1`);
  await page.goto(`${BASE}/tenant/request`);
  await page.locator("#description").fill("I smell gas near the water heater");
  await page.getByRole("button", { name: "Submit" }).click();
  await page.getByText("Owner is being called").first().waitFor({ timeout: 8000 });
  await page.locator("summary", { hasText: "How to do this" }).nth(0).click();
  await page.getByText(/Never go back in to look for the leak/).waitFor();
  check("gas emergency guide says never go back in", true);

  check("no console errors in guide checks", errors.length === 0, errors.join(" | "));
  await context.close();
}

await browser.close();
console.log(failed === 0 ? "\nAll end to end checks passed." : `\n${failed} check(s) failed.`);
process.exit(failed === 0 ? 0 : 1);
