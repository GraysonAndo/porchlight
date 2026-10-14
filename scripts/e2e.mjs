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


/** Opens ?reset=1 and waits until the reset has actually happened (the page removes the flag). */
async function resetDemo(page) {
  await page.goto(`${BASE}/?reset=1`);
  await page.waitForFunction(() => !window.location.search.includes("reset=1"));
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


const wait20 = { timeout: 20000 };

/** Types a message to Porchlight on the tenant screen. */
async function textAgent(page, text) {
  await page.locator("#tenant-msg").fill(text);
  await page.getByRole("button", { name: "Send", exact: true }).click();
}

/** Resets, opens the tenant screen, sends a message, and waits for Porchlight's reply. */
async function reportByText(page, text) {
  await resetDemo(page);
  await page.goto(`${BASE}/tenant`);
  await textAgent(page, text);
  await page.getByText(/near an outlet|sounds like an emergency|logged this as|I'm here|Sent\.|rent is|I don't know/i).first().waitFor(wait20);
  // Porchlight types its replies out over a second or two. Let them all appear.
  await page.waitForTimeout(3500);
}

// ======================= The journey: tenant texts, owner approves, both get updates =======================
{
  const { context, page, errors } = await newPage({ viewport: { width: 390, height: 844 } });
  await resetDemo(page);
  check("home explains who is who", (await count(page, "Who is who")) > 0);
  check("home says the owner decides and pays", (await page.getByText(/Does not choose or pay for the repair/).count()) > 0);

  await page.getByRole("button", { name: /I am a tenant/ }).click();
  await page.waitForURL("**/tenant");
  check("header says Tenant view", (await count(page, "Tenant view")) > 0);
  check("the tenant has one screen, no steps", (await page.getByText(/step \d of \d/i).count()) === 0);

  await page.getByRole("button", { name: "My water heater is leaking" }).click();
  await page.getByText(/near an outlet/).waitFor(wait20);
  await page.getByRole("button", { name: /^2\s+No$/ }).click();
  await page.getByText(/Two quick steps/).waitFor(wait20);
  check("the safety steps are plain text in the chat, with the gas rule", (await page.getByText(/never touch the gas valve/).count()) > 0);
  check("the how-to guide is folded under the message", (await page.getByText(/How to close the water valve/).count()) > 0);
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await page.getByText(/silver sticker/).waitFor(wait20);
  await page.getByRole("button", { name: "Send a photo" }).click();
  await page.getByRole("button", { name: "Photo of the label" }).click();
  await page.getByText(/Is it 15C0412-X/).waitFor(wait20);
  await page.getByRole("button", { name: "Y", exact: true }).click();
  await page.getByText(/I'm watching this/).waitFor(wait20);
  check("a texted update tag shows on Porchlight's messages", (await page.getByText("Texted").count()) > 0);

  // The tenant never sees owner decisions, prices, or internals.
  const tenantText = await page.locator("main").innerText();
  for (const word of ["AI confidence", "Likely cause", "Quote check", "Repair or replace", "5-year forecast", "Rent increase", "Approve", "Willow Glen", "$2,450", "$2,850", "You save"]) {
    check(`the tenant screen has no "${word}"`, !tenantText.includes(word), "found in tenant text");
  }
  await page.getByText(/your landlord is choosing a plumber/).waitFor(wait20);
  check("the tenant is texted that the landlord is choosing, with no price", true);

  // The owner has one thing to do, already worked out.
  await page.goto(`${BASE}/owner`);
  await page.getByRole("button", { name: "Approve", exact: true }).waitFor(wait20);
  check("owner header says Owner view", (await count(page, "Owner view")) > 0);
  check("the owner inbox says 1 thing needs your OK", (await count(page, "1 thing needs your OK")) > 0);
  const card = await page.locator("main").innerText();
  check("the card has the pick, the limit, and the saving", /Willow Glen/.test(card) && card.includes("$2,450") && card.includes("$2,695") && card.includes("$400"));
  check("the status tracker is at Quoted", (await page.getByRole("list", { name: "Job status" }).getByText("Quoted").count()) > 0);
  await page.getByText("See the details, or change something").click();
  check("changing something is one tap away", (await page.getByRole("link", { name: "Pick another vendor, limit, or time" }).count()) > 0);
  check("the owner can read the texts Porchlight sent", (await count(page, "Texts from Porchlight")) > 0);
  await page.getByRole("button", { name: "Approve", exact: true }).click();
  await page.getByRole("button", { name: "Mark done" }).waitFor(wait20);
  check("one tap books it, and Mark done appears", (await page.getByText(/Booked: Willow Glen/).count()) > 0);

  // Both people get text updates.
  await page.goto(`${BASE}/tenant`);
  await page.getByText(/Good news: Willow Glen Water Heater Co\. is booked/).waitFor(wait20);
  check("the tenant is texted who is coming and when", true);
  await page.getByRole("button", { name: /^1\s+That works$/ }).click();
  await page.getByText(/see you then/).waitFor(wait20);
  await page.goto(`${BASE}/owner`);
  await page.getByText(/Your tenant confirmed the visit window/).first().waitFor(wait20);
  check("the owner is texted that the tenant confirmed", true);
  await page.getByRole("button", { name: "Mark done" }).click();
  await page.getByText("All done", { exact: true }).waitFor(wait20);
  await page.goto(`${BASE}/tenant`);
  await page.getByText(/All fixed/).waitFor(wait20);
  check("the tenant is texted when it is fixed", true);
  await page.reload();
  await page.getByText(/All fixed/).waitFor(wait20);
  check("the whole conversation survives a reload", (await count(page, "Good news")) > 0);

  // Text updates can be turned off.
  await page.getByRole("switch", { name: "Text updates" }).click();
  check("turning text updates off says so", (await count(page, "text updates are off")) > 0 || (await count(page, "Text updates are off")) > 0);
  await page.getByRole("switch", { name: "Text updates" }).click();

  // The record and the plan updated themselves.
  await page.goto(`${BASE}/owner/record`);
  await page.getByText("New, added automatically").waitFor(wait20);
  check("the new heater is in the house record by itself", (await count(page, "26J0007-A")) > 0);
  await page.goto(`${BASE}/owner/forecast`);
  await page.getByText("beyond 5 years").first().waitFor(wait20);
  check("the forecast no longer has the water heater overdue", (await page.getByText("overdue or due now").count()) === 0);
  check("no console errors in the journey", errors.length === 0, errors.join(" | "));
  await context.close();
}

// ======================= Owner detail pages, filled in by the agent =======================
{
  const { context, page, errors } = await newPage({ viewport: { width: 1280, height: 800 } });
  await resetDemo(page);
  await page.goto(`${BASE}/owner`);
  check("a new owner sees All quiet and a way to try it", (await count(page, "All quiet")) > 0 && (await page.getByRole("button", { name: "Show me a sample repair" }).count()) > 0);
  await page.getByRole("button", { name: "Show me a sample repair" }).click();
  await page.getByRole("button", { name: "Approve", exact: true }).waitFor(wait20);

  await page.goto(`${BASE}/owner/record`);
  await page.getByText("Hearthline").first().waitFor();
  check("the record has the model from the tenant's photo", (await count(page, "HL-40G-NG")) > 0);
  check("the record says it came from the tenant's photo", (await page.getByText(/label photo sent by the tenant/).count()) > 0);
  check("the label year is marked as a guess", (await count(page, "Inferred from the serial")) === 0);

  await page.getByRole("link", { name: /Add or check equipment details/ }).click();
  await page.waitForURL("**/owner/label");
  await page.getByRole("button", { name: "Use sample label photo" }).click();
  await page.locator("#label-serial").waitFor({ timeout: 8000 });
  check("the label year is marked as inferred from the serial", (await count(page, "Inferred from the serial")) > 0);
  check("the label tool compares with the record", (await page.getByText("Matches the record").count()) >= 5);
  await page.locator("#label-serial").fill("15C0412-Y");
  await page.getByText("Different from the record").first().waitFor();
  await page.getByRole("button", { name: "Save to the house record" }).click();
  await page.waitForURL("**/owner/record");
  await page.getByText("15C0412-Y").waitFor();
  check("a checked record shows it was checked against a label", (await count(page, "Checked against a label")) > 0);

  await page.goto(`${BASE}/owner/forecast`);
  await page.locator("text=overdue or due now >> visible=true").first().waitFor();
  check("forecast marks the water heater overdue", true);
  await page.goto(`${BASE}/owner/decide`);
  await page.getByText("Replace it").waitFor();
  check("decision is replace, with the real numbers", (await count(page, "110%")) > 0);

  await page.goto(`${BASE}/owner/quote`);
  await page.getByText(/Best pick/).waitFor({ timeout: 8000 });
  check("quote screen picks Willow Glen at $2,450", (await page.getByText(/Best pick:.*Willow Glen.*\$2,450/).count()) > 0);
  check("Bayside is slightly high", (await page.locator("label", { hasText: "Bayside" }).getByText("Slightly high").count()) > 0);
  check("A1 is skipped for a missing license", (await page.getByText(/A1 Rapid Plumbing:.*No license number is shown/).count()) > 0);
  await page.locator("label", { hasText: "Bayside" }).click();
  await page.getByRole("heading", { name: "Bayside Plumbing and Heating" }).waitFor();
  await page.getByRole("button", { name: "Use a sample quote" }).click();
  await page.getByRole("heading", { name: "Harbor View Plumbing" }).waitFor();
  check("pasted sample quote is rated high", (await page.getByText(/about 22% above the top/).count()) > 0);
  await page.locator("#paste-quote").fill("Nothing here to read");
  await page.getByRole("button", { name: "Check this quote" }).click();
  await page.getByText("I could not find any dollar amounts").waitFor();
  await page.locator("#paste-quote").fill("Cheap Co\nWater heater ..... $500\nLabor ..... $300\nTotal $900");
  await page.getByRole("button", { name: "Check this quote" }).click();
  await page.getByText(/lines add up to \$800/).waitFor();
  check("a quote whose lines do not add up is flagged", true);

  // The owner picks a different vendor by hand, and the agent texts the tenant that one.
  await page.goto(`${BASE}/owner/book`);
  await page.locator("label", { hasText: "Bayside" }).click();
  await page.getByLabel("To the vendor: Bayside Plumbing and Heating").waitFor({ timeout: 8000 });
  check("not-to-exceed defaults to 10% above the quote", (await page.locator("#nte").inputValue()) === "3135");
  await page.getByRole("button", { name: "Approve and send" }).click();
  await page.getByText("Approved and sent").waitFor();
  check("booking says nothing was actually sent", (await count(page, "Nothing was actually sent")) > 0);
  await page.goto(`${BASE}/tenant`);
  await page.getByText(/Good news: Bayside Plumbing and Heating is booked/).waitFor(wait20);
  check("the tenant is texted the vendor the owner picked by hand", true);

  // Rent math.
  await page.goto(`${BASE}/owner/rent`);
  await page.getByText("$3,456.00").first().waitFor();
  check("rent shows max new rent $3,456.00", true);
  check("rent shows 8.0% cap", (await count(page, "8.0%")) > 0);
  await page.locator("#proposed-rent").fill("3552");
  await page.getByText("90 days").first().waitFor();
  check("rent shows 90 day notice at 11%", true);
  check("draft, not legal advice is next to the result", (await count(page, "Draft, not legal advice")) >= 2);
  await page.getByRole("button", { name: "Copy notice" }).click();
  await page.getByText(/Copied to your clipboard/).waitFor();
  const clip = await page.evaluate(() => navigator.clipboard.readText());
  check("copied notice is stamped as a draft", clip.startsWith("DRAFT, NOT LEGAL ADVICE"));

  // Reset clears the agent too.
  await page.getByRole("button", { name: "Reset demo" }).click();
  await page.waitForURL(`${BASE}/`);
  await page.goto(`${BASE}/tenant`);
  check("Reset demo clears the conversation", (await count(page, "Good news")) === 0);
  await page.goto(`${BASE}/owner/record`);
  await page.getByText("not on file yet").waitFor();
  check("Reset demo clears the heater record", (await count(page, "15C0412-Y")) === 0);
  check("no console errors in the owner detail pages", errors.length === 0, errors.join(" | "));
  await context.close();
}

// ======================= Tenant cannot reach the label =======================
{
  const { context, page, errors } = await newPage({ viewport: { width: 1280, height: 800 } });
  await reportByText(page, "water heater is leaking all over the garage");
  await page.getByRole("button", { name: /^2\s+No$/ }).click();
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await page.getByRole("button", { name: "I can't reach it" }).waitFor(wait20);
  await page.getByRole("button", { name: "I can't reach it" }).click();
  await page.getByText(/work from the inspection report/).waitFor(wait20);
  await page.goto(`${BASE}/owner`);
  await page.getByText(/couldn't reach the water heater label/).first().waitFor(wait20);
  check("the owner is told the tenant could not reach the label", true);
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
  check("no console errors when the label was skipped", errors.length === 0, errors.join(" | "));
  await context.close();
}


// ======================= Watch it work =======================
{
  const { context, page, errors } = await newPage({ viewport: { width: 1280, height: 800 } });
  await resetDemo(page);
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
  await tenant.getByText(/Good news: Willow Glen.*is booked/).waitFor(wait);
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

// ======================= The fix list: safety, quotes, status, rent, chat, pricing =======================
{
  const { context, page, errors } = await newPage({ viewport: { width: 1280, height: 800 } });
  const wait = { timeout: 20000 };
  const report = (text) => reportByText(page, text);

  // Triage follows what the tenant wrote.
  await report("I smell gas and I feel dizzy");
  const gasText = await page.locator("main").innerText();
  check("gas smell with dizziness takes the emergency path", /sounds like an emergency/i.test(gasText) && /leave the home/i.test(gasText) && /911/.test(gasText));
  check("no gas valve instruction for a gas smell", !/turn the gas|gas valve to|pilot|relight/i.test(gasText), "found one");

  await report("The toilet is clogged and overflowing");
  const toiletText = await page.locator("main").innerText();
  check("an overflowing toilet gets toilet steps, not water heater steps", /do not flush again/i.test(toiletText) && !/water heater/i.test(toiletText), toiletText.slice(0, 160));

  await report("water heater is leaking all over the garage");
  const leakText = await page.locator("main").innerText();
  check("the leak steps never mention operating a gas valve", !/turn the gas|gas valve to|pilot|relight/i.test(leakText), "found one");
  await page.getByRole("button", { name: /^2\s+No$/ }).click();
  await page.getByText(/never touch the gas valve/).waitFor(wait);
  check("the leak message says what to do about a gas smell", true);
  await page.goto(`${BASE}/owner/request`);
  check("the owner sees the three spec buckets: SOON, not URGENT", (await page.getByText("SOON", { exact: true }).count()) > 0 && (await page.getByText("URGENT", { exact: true }).count()) === 0);

  // The owner home is an approval inbox with a status that moves by itself.
  await resetDemo(page);
  await page.goto(`${BASE}/owner`);
  await page.getByRole("button", { name: "Show me a sample repair" }).click();
  await page.getByRole("button", { name: "Approve", exact: true }).waitFor(wait);
  check("owner home shows the plan, ready for one tap", (await page.getByText(/Replace the water heater with Willow Glen/).count()) > 0);
  check("owner home shows the status tracker at Quoted", (await page.getByRole("list", { name: "Job status" }).getByText("Quoted").count()) > 0);
  await page.getByRole("button", { name: "Approve", exact: true }).click();
  await page.getByText(/Approved. Confirming/).waitFor(wait);
  check("approval shows Approved first", true);
  await page.getByRole("button", { name: "Mark done" }).waitFor(wait);
  check("approved moves to booked on its own", true);
  await page.getByRole("button", { name: "Mark done" }).click();
  await page.getByText("All done", { exact: true }).waitFor(wait);
  check("Mark done moves the job to done", true);
  await page.reload();
  await page.getByText("All done", { exact: true }).waitFor(wait);
  check("done survives a reload", true);

  // Nothing forces the owner to type: approving with the defaults works.
  await resetDemo(page);
  await page.goto(`${BASE}/owner/book`);
  await page.getByRole("button", { name: /Approve Porchlight.s plan/ }).waitFor(wait);
  check("the book screen has one big Approve and nothing invalid by default", true);
  await page.locator("label", { hasText: "Willow Glen" }).click();
  await page.getByLabel("To the vendor: Willow Glen Water Heater Co.").waitFor(wait);
  await page.getByLabel("To the vendor: Willow Glen Water Heater Co.").fill("Hello, edited by the owner.");
  check("the drafted vendor message can be edited in place", (await page.getByLabel("To the vendor: Willow Glen Water Heater Co.").inputValue()) === "Hello, edited by the owner.");

  // Quote checker: typical total equals the sum of the line ranges, every row has a pill.
  await page.goto(`${BASE}/owner/quote`);
  await page.getByText("See the line by line math").click();
  const num = (s) => Number(s.replace(/[^0-9]/g, ""));
  const typical = await page.locator("details tbody tr td:nth-child(3)").allInnerTexts();
  const lows = typical.map((s) => num(s.split("to")[0]));
  const highs = typical.map((s) => num(s.split("to")[1]));
  const totalCell = await page.locator("details tfoot td:nth-child(3)").first().innerText();
  check("the typical total equals the sum of the typical line ranges", lows.reduce((a, b) => a + b, 0) === num(totalCell.split("to")[0]) && highs.reduce((a, b) => a + b, 0) === num(totalCell.split("to")[1]), `${lows} ${highs} ${totalCell}`);
  const rowTexts = await page.locator("details tbody tr td:nth-child(1)").allInnerTexts();
  check("every quote row has a pill", rowTexts.every((r) => /OK|High|Slightly high|Low|Ask|Not compared/.test(r)), rowTexts.join(" | "));
  await page.locator("#paste-quote").fill("Furnace replacement\nLabor ..... $2,000\nTotal $6,000");
  await page.getByRole("button", { name: "Check this quote" }).click();
  await page.getByText(/not in Porchlight's price table yet/).waitFor(wait);
  check("a job that is not in the table gets no verdict, and says so", (await page.getByText(/heating or cooling job/).count()) > 0);
  await page.locator("#quote-photo").setInputFiles({ name: "quote.png", mimeType: "image/png", buffer: Buffer.from("fake image") });
  await page.getByRole("heading", { name: "Harbor View Plumbing" }).waitFor(wait);
  check("a quote photo can be uploaded (sample reading)", (await page.getByText(/Read from quote.png \(sample result\)/).count()) > 0);

  // Rent: empty inputs, ignored question, CPI sanity, AB 1482, reset.
  await resetDemo(page);
  await page.goto(`${BASE}/owner/rent`);
  check("the rent page says California only and names AB 1482", (await count(page, "California only, for now")) > 0 && (await count(page, "AB 1482")) > 0);
  check("the rent page links the statute", (await page.getByRole("link", { name: /Civil Code 1947.12/ }).getAttribute("href"))?.includes("leginfo.legislature.ca.gov") === true);
  check("the rent page does not ask a question it ignores", (await count(page, "lived there 12 months or more")) === 0);
  await page.locator("#current-rent").fill("");
  await page.getByText("Fill in the numbers to see the result").waitFor(wait);
  check("an empty current rent blocks the result instead of using an old number", (await page.getByText("Highest allowed new rent").count()) === 0);
  await page.locator("#current-rent").blur();
  await page.getByText("Highest allowed new rent").first().waitFor(wait);
  check("leaving the box restores the number and the result", (await page.locator("#current-rent").inputValue()) === "3200");
  await page.locator("#cpi").fill("-5");
  await page.getByText(/Check this number/).waitFor(wait);
  check("a negative CPI is flagged", true);
  await page.locator("#cpi").fill("3");
  await page.getByLabel("The tenant was given the required written exemption notice.").check();
  await page.getByLabel("The building is less than 15 years old.").check();
  await page.locator("#proposed-rent").fill("3600");
  await page.getByRole("button", { name: "Reset demo" }).click();
  await page.waitForURL(`${BASE}/`);
  await page.goto(`${BASE}/owner/rent`);
  const states = [
    await page.getByLabel("It is a single family home or a condo.").isChecked(),
    await page.getByLabel("It is not owned by a REIT, a corporation, or an LLC with a corporate member.").isChecked(),
    await page.getByLabel("The tenant was given the required written exemption notice.").isChecked(),
    await page.getByLabel("The building is less than 15 years old.").isChecked(),
  ];
  check("Reset demo restores every rent checkbox to its default", states.join() === "true,true,false,false", states.join());
  check("Reset demo restores the rent numbers", (await page.locator("#cpi").inputValue()) === "3" && (await page.locator("#proposed-rent").inputValue()) === "3360");

  // Tenant: rent payment, Q&A from the record, skipped step.
  await resetDemo(page);
  await page.goto(`${BASE}/tenant`);
  await page.getByRole("button", { name: "How much is my rent?" }).click();
  await page.getByText("Your rent is $3,200 per month.").waitFor(wait);
  await textAgent(page, "How old is the water heater?");
  await page.getByText(/not on file yet/).first().waitFor(wait);
  check("the tenant chat says the label is not on file instead of inventing a brand", (await page.getByText("Hearthline").count()) === 0);
  await textAgent(page, "Can I have a dog?");
  await page.getByText(/I don't know whether pets are allowed/).waitFor(wait);
  await page.getByRole("button", { name: /Ask Sample Owner/ }).click();
  await page.getByText(/I'll text you Sample Owner's answer/).waitFor(wait);
  check("an unknown answer says I don't know and offers to ask the owner", true);
  await page.getByRole("button", { name: /Pay \$3,200 \(demo\)/ }).click();
  await page.getByText("Paid (demo)").first().waitFor(wait);
  await page.getByText(/marked paid. This is a demo/).first().waitFor(wait);
  check("the tenant can pay rent in the demo, gets a text, and nothing is charged", (await count(page, "nothing was charged")) > 0);
  await page.goto(`${BASE}/owner`);
  await page.getByText("Paid (demo)").first().waitFor(wait);
  await page.getByText(/paid October 2026 rent/).first().waitFor(wait);
  check("the owner home shows rent as paid, and the owner got a text", true);
  await page.goto(`${BASE}/tenant`);
  await page.getByRole("button", { name: "Undo (demo)" }).click();
  await page.getByText("Not marked paid").first().waitFor(wait);

  await resetDemo(page);
  await page.goto(`${BASE}/owner/label`);
  check("the owner can still add the heater details by typing", (await page.getByRole("radio", { name: "Type the details in" }).count()) > 0);

  // Pages and routes.
  await page.goto(`${BASE}/pricing`);
  await page.getByRole("button", { name: "I would pick Plus" }).click();
  await page.getByRole("button", { name: /I would pick this/ }).waitFor(wait);
  check("pricing shows $4, $6, and $8 per unit per month", (await page.getByText("$4").count()) > 0 && (await page.getByText("$6").count()) > 0 && (await page.getByText("$8").count()) > 0 && (await count(page, "per unit per month")) >= 3);
  check("pricing says month to month and California only", (await count(page, "Month to month")) > 0 && (await count(page, "California only, for now")) > 0);
  await page.goto(`${BASE}/feedback`);
  await page.getByText(/would pick Plus \(\$6\)/).first().waitFor(wait);
  check("the pricing pick shows up on the feedback page", true);
  await page.goto(`${BASE}/about`);
  await page.getByText("What counts as an emergency?").click();
  check("the FAQ answers emergencies", (await count(page, "gives your tenant no fix steps")) > 0);
  check("the page explains how price ranges work and gives a contact", (await count(page, "How our price ranges work")) > 0 && (await count(page, "Contact")) > 0);
  await page.goto(`${BASE}/`);
  check("home says California only and tells the whole chain", (await count(page, "California only, for now")) > 0 && (await count(page, "How it works")) > 0 && (await count(page, "Why not a bigger property tool?")) > 0);
  check("the footer links to pricing, FAQ, and contact on every page", (await page.getByRole("navigation", { name: "More about Porchlight" }).getByRole("link").count()) === 4);
  await page.goto(`${BASE}/definitely-not-a-page`);
  check("an unknown page shows a friendly page, not a bare 404", (await count(page, "not part of the demo")) > 0);
  check("no console errors in the fix list checks", errors.filter((e) => !/404/.test(e)).length === 0, errors.join(" | "));
  await context.close();
}

// ======================= Old links still work =======================
{
  const { context, page } = await newPage();
  const redirects = [
    ["/triage", "/tenant"],
    ["/tenant/request", "/tenant"],
    ["/tenant/safety", "/tenant"],
    ["/tenant/label", "/tenant"],
    ["/tenant/status", "/tenant"],
    ["/label", "/owner/label"],
    ["/record", "/owner/record"],
    ["/quote", "/owner/quote"],
    ["/decide", "/owner/decide"],
    ["/approve", "/owner/book"],
    ["/forecast", "/owner/forecast"],
    ["/rent", "/owner/rent"],
    ["/login", "/"],
    
    ["/tenant/requests/new", "/tenant"],
    ["/requests/new", "/tenant"],
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
  await resetDemo(page);
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
  await page.goto(`${BASE}/tenant`);
  await textAgent(page, "water heater is leaking");
  await page.getByText(/near an outlet/).waitFor({ timeout: 8000 });
  check("app works with localStorage blocked", true);
  await page.getByRole("button", { name: "Leave feedback" }).click();
  await page.locator("dialog").getByText("4", { exact: true }).click();
  await page.getByRole("button", { name: "Save feedback" }).click();
  await page.getByText(/Saved. Thank you/).waitFor();
  check("feedback still saves in memory with storage blocked", true);
  check("no uncaught errors with storage blocked", errors.length === 0, errors.join(" | "));
  await context.close();
}


// ======================= Triage by text: emergencies, steps, guides =======================
{
  const { context, page, errors } = await newPage({ viewport: { width: 1280, height: 800 } });

  await reportByText(page, "I smell gas near the water heater");
  const gas = await page.locator("main").innerText();
  check("gas smell tells the tenant to leave the home and call 911", /leave the home/i.test(gas) && /911/.test(gas));
  check("gas smell never mentions a gas valve to touch", !/turn the gas|gas valve to|pilot|relight/i.test(gas));
  check("gas smell never asks for a photo", (await page.getByText(/silver sticker/).count()) === 0);
  await page.goto(`${BASE}/owner`);
  await page.getByText("Emergency: Gas safety").first().waitFor(wait20);
  check("the owner gets an emergency card and a call", (await page.getByText(/Porchlight is calling about an emergency/).count()) > 0);
  await page.getByRole("button", { name: "I'm on it" }).click();
  await page.goto(`${BASE}/tenant`);
  await page.getByText(/Your landlord is on it/).waitFor(wait20);
  check("the owner's acknowledgement is texted to the tenant", true);

  await reportByText(page, "The toilet is clogged");
  check("a clogged toilet is not the water heater result", (await page.getByText(/water heater/i).count()) === 0);

  await reportByText(page, "We have no heat and it is freezing");
  const heat = await page.locator("main").innerText();
  check("no heat gives the tenant no fix steps", !/\n1\)/.test(heat));
  await page.goto(`${BASE}/owner`);
  await page.getByText(/Porchlight is calling about hvac/i).first().waitFor(wait20);
  check("no heat calls the owner", true);

  await reportByText(page, "I feel dizzy and have a headache near the furnace");
  check("dizziness near a gas appliance is an emergency", (await page.getByText(/sounds like an emergency/).count()) > 0);

  // HELP gives the hand-written guide, in plain text.
  await reportByText(page, "water heater is leaking");
  await page.getByRole("button", { name: /^2\s+No$/ }).click();
  await page.getByRole("button", { name: "HELP" }).waitFor(wait20);
  await page.getByRole("button", { name: "HELP" }).click();
  await page.getByText(/Turn off the water to the water heater/).waitFor(wait20);
  check("HELP sends the water valve guide in plain text", (await count(page, "Stop and get help if")) > 0);
  check("the guide never tells the tenant to touch gas", !/turn the gas|pilot|relight/i.test(await page.locator("main").innerText()));

  // A tenant asks a question, and an unknown answer says so.
  await reportByText(page, "Can I have a dog?");
  check("an unknown question says I don't know", (await page.getByText(/I don't know whether pets are allowed/).count()) > 0);

  // Approve limit

  await resetDemo(page);
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

  // Text spacing on visible text, on every page
  for (const path of ["/", "/pricing", "/about", "/sms", "/tenant", "/owner", "/owner/request", "/owner/record", "/owner/forecast", "/owner/rent", "/owner/decide", "/owner/quote", "/owner/book", "/owner/label", "/feedback"]) {
    await page.goto(`${BASE}${path}`);
    await page.waitForTimeout(1500);
    const bad = await page.evaluate((pagePath) => {
      const hits = [];
      for (const el of Array.from(document.body.querySelectorAll("p, li, dd, dt, td, th, span, h1, h2, h3"))) {
        // innerText is what is rendered and copied: blocks are separated by line breaks, inline text is not.
        const t = (el.innerText || "").trim().replace(/\s*\n\s*/g, " | ");
        const m = t.match(/[A-Za-z]:\d|[a-z]\d{4}[a-z]|of\d\.\d|\$[\d,.]+(per|to|and)\b|\d(to|per|and)\b|\b(to|and|per|of|from|over|since)\d|\)[A-Za-z]|[a-z]\([A-Za-z$]/);
        if (m && !/^\d+(st|nd|rd|th)$/.test(m[0])) hits.push(`${pagePath}: "${t.slice(0, 50)}"`);
      }
      return hits.slice(0, 3);
    }, path);
    check(`no words glued to numbers on ${path}`, bad.length === 0, bad.join(" | "));
  }
  check("no console errors in the QA checks", errors.length === 0, errors.join(" | "));
  await context.close();
}

await browser.close();
console.log(failed === 0 ? "\nAll end to end checks passed." : `\n${failed} check(s) failed.`);
process.exit(failed === 0 ? 0 : 1);
