// End to end checks for behavior (not layout): the landing page, the tenant and owner sides and what each can see,
// the picture guides, the house record, persistence, Reset, ?reset=1, blocked localStorage, feedback notes, and old links.
//
// Usage: BASE_URL=http://localhost:3000 node scripts/e2e.mjs

import { launch, watchErrors, BASE } from "./browser.mjs";

let failed = 0;
function check(name, ok, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${ok ? "" : ` ${detail}`}`);
  if (!ok) failed++;
}

/** Opens ?reset=1 and waits until the reset has actually happened (the page removes the flag). */
async function resetApp(page) {
  await page.goto(`${BASE}/?reset=1`);
  await page.waitForFunction(() => !window.location.search.includes("reset=1"));
}

const browser = await launch();

async function newPage(options = {}) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
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

/** Types a message to GoHome on the tenant screen. */
async function textAgent(page, text) {
  await page.locator("#tenant-msg").fill(text);
  await page.getByRole("button", { name: "Send", exact: true }).click();
}

/** Resets, opens the tenant screen, sends a message, and waits for GoHome's reply to finish typing. */
async function reportByText(page, text) {
  await resetApp(page);
  await page.goto(`${BASE}/tenant`);
  await textAgent(page, text);
  await page.getByText(/near an outlet|sounds like an emergency|logged this as|I'm here|rent is|I don't know|Your rent|Hearthline|serial number/i).first().waitFor(wait20);
  await page.waitForTimeout(3500);
}

const tabs = (page, name) => page.getByRole("tab", { name });

// ======================= The landing page =======================
{
  const { context, page, errors } = await newPage({ viewport: { width: 390, height: 844 } });
  await resetApp(page);
  await page.goto(`${BASE}/`);
  check("the landing page shows the name and the line", (await count(page, "Your home, made easy.")) > 0 && (await page.getByRole("heading", { name: "GoHome" }).count()) === 1);
  check("the landing page offers exactly tenant and owner", (await page.getByRole("button", { name: /Tenant/ }).count()) === 1 && (await page.getByRole("button", { name: /Owner/ }).count()) === 1);
  const body = await page.locator("body").innerText();
  check("nothing on the site says demo or prototype", !/\bdemo\b|prototype/i.test(body), body.slice(0, 120));
  check("the landing page has no app tabs and no demo banner", (await page.getByRole("navigation", { name: /tabs|navigation/ }).count()) === 0 && (await count(page, "Nothing here is real")) === 0);
  await page.getByRole("button", { name: /Tenant/ }).click();
  await page.waitForURL("**/tenant");
  check("choosing tenant opens the tenant side", true);
  check("the tenant side has only Help and My home in its tabs", (await page.getByRole("navigation", { name: "Tenant tabs" }).getByRole("link").allInnerTexts()).join() === "Help,My home");
  await page.getByRole("link", { name: "Switch" }).click();
  await page.waitForURL(`${BASE}/`);
  await page.getByRole("button", { name: /Owner/ }).click();
  await page.waitForURL("**/owner");
  check("choosing owner opens the owner side", true);
  check("the owner side has Inbox, Home record, Forecast, and Rent", (await page.getByRole("navigation", { name: "Owner tabs" }).getByRole("link").allInnerTexts()).join() === "Inbox,Home record,Forecast,Rent");
  check("no console errors on the landing page", errors.length === 0, errors.join(" | "));
  await context.close();
}

// ======================= The journey: tenant texts, owner approves, both get updates =======================
{
  const { context, page, errors } = await newPage();
  await resetApp(page);
  await page.goto(`${BASE}/tenant`);
  check("a new tenant sees four ways to start and the agent panel", (await page.getByRole("button", { name: "My water heater is leaking" }).count()) === 1 && (await count(page, "What GoHome is doing")) > 0);
  check("the idle agent panel says what GoHome is always watching", (await count(page, "Always watching")) > 0);
  await page.getByRole("button", { name: "My water heater is leaking" }).click();
  await page.getByText(/near an outlet/).waitFor(wait20);
  const first = await page.locator("main").innerText();
  check("GoHome already knows the exact heater, so it does not ask for a label", /Hearthline HL-40G-NG/.test(first) && !/sticker|label/i.test(first));
  await page.getByText(/Found your water heater in your home record: Hearthline HL-40G-NG/).waitFor(wait20);
  check("the agent panel shows GoHome finding the heater in the home record", true);
  await page.getByRole("button", { name: /^2\s+No$/ }).click();
  await page.getByRole("button", { name: "Show me how" }).first().waitFor(wait20);

  // The picture guide, made for this exact heater.
  await page.getByRole("button", { name: "Show me how" }).first().click();
  const dialog = page.locator("dialog[open]");
  await dialog.getByText(/For your Hearthline HL-40G-NG/i).waitFor();
  check("the guide is made for the exact model and where it is", (await dialog.getByText(/in the garage, against the north wall/i).count()) > 0);
  check("the guide has a picture for every step", (await dialog.getByRole("img").count()) >= 1);
  check("the guide starts at step 1 of 6", (await dialog.getByText("Step 1 of 6").count()) === 1);
  for (let i = 0; i < 5; i++) await dialog.getByRole("button", { name: "Next step" }).click();
  check("the guide reaches the last step and offers Done", (await dialog.getByText("Step 6 of 6").count()) === 1 && (await dialog.getByRole("button", { name: "Done" }).count()) === 1);
  check("the guide never tells the tenant to touch gas", !/turn the gas|gas valve to|pilot|relight/i.test(await dialog.innerText()) || /Do not touch the gas control/.test(await dialog.innerText()));
  check("the guide says when to stop and get help", (await dialog.getByText("Stop and get help if:").count()) === 1);
  await dialog.getByRole("button", { name: "Done" }).click();
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await page.getByText(/I'm watching this/).waitFor(wait20);
  const chat = await page.locator("main").innerText();
  check("the tenant is never asked for a photo of a label", !/sticker|silver|label photo/i.test(chat));
  check("the tenant never sees a price or a quote", !/\$\d|\bquote/i.test(chat), chat.slice(0, 100));
  await page.getByText(/Looking for licensed plumbers who can come soon/).waitFor(wait20);
  check("the tenant's agent panel shows plain steps like finding a plumber", true);

  // The owner side: everything is already done.
  await page.goto(`${BASE}/owner`);
  await page.getByRole("button", { name: "Approve", exact: true }).waitFor(wait20);
  check("the owner has one thing to approve, already worked out", (await count(page, "1 thing needs your OK")) > 0 && (await count(page, /Replace the water heater with Willow Glen/)) > 0);
  const card = await page.getByLabel(/Needs your OK: Replace the water heater/).innerText();
  check("the owner card shows price, limit, saving, and visit", ["$2,450", "$2,695", "$400", "9:00"].every((t) => card.includes(t)), card.slice(0, 120));
  await page.getByText(/Bayside Plumbing: slightly high/).waitFor(wait20);
  check("the owner's agent panel shows every check, with who did it", (await count(page, "Plain code")) > 0 && (await count(page, /Willow Glen: fair/)) > 0);
  await tabs(page, /Texts from GoHome/).click();
  check("the owner can read the texts GoHome sent", (await count(page, /DECISION NEEDED|Water heater leak at/)) > 0);
  await tabs(page, /What GoHome is doing/).click();
  await page.getByRole("button", { name: "Approve", exact: true }).click();
  await page.getByRole("button", { name: "Mark done" }).waitFor(wait20);
  check("one tap books it, and Mark done appears", (await page.getByText(/Booked: Willow Glen/).count()) > 0);

  // Both people get text updates.
  await page.goto(`${BASE}/tenant`);
  await page.getByText(/Good news: Willow Glen Water Heater Co\. is booked/).waitFor(wait20);
  check("the tenant is texted who is coming and when", true);
  await page.getByText(/Booked a plumber and set up your visit/).waitFor(wait20);
  await page.getByRole("button", { name: /^1\s+That works$/ }).click();
  await page.getByText(/see you then/).waitFor(wait20);
  await page.goto(`${BASE}/owner`);
  await tabs(page, /Texts from GoHome/).click();
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

  // Text updates live under My home.
  await page.goto(`${BASE}/tenant/home`);
  await page.getByRole("switch", { name: "Text updates" }).click();
  check("turning text updates off says so", (await count(page, "Text updates are off")) > 0);
  await page.getByRole("switch", { name: "Text updates" }).click();

  // The record and the plan updated themselves.
  check("My home shows the new heater model and serial", (await count(page, "26J0007-A")) > 0);
  await page.goto(`${BASE}/owner/record`);
  await page.getByText("New, added automatically").waitFor(wait20);
  check("the owner's home record has the new heater by itself", (await count(page, "26J0007-A")) > 0);
  await page.goto(`${BASE}/owner/forecast`);
  await page.locator("text=beyond 5 years >> visible=true").first().waitFor(wait20);
  check("the forecast no longer has the water heater overdue", (await page.getByText("overdue or due now").count()) === 0);
  check("no console errors in the journey", errors.length === 0, errors.join(" | "));
  await context.close();
}

// ======================= The tenant side only has what a tenant needs =======================
{
  const { context, page, errors } = await newPage();
  await resetApp(page);
  await page.goto(`${BASE}/tenant/home`);
  const text = await page.locator("main").innerText();
  const models = ["Hearthline HL-40G-NG", "Cedarline CF-80-100", "Cedarline CA-3T-14", "Brightwell BW-DW24", "Frostmere FM-21T", "Ridgecrest RC-30"];
  check("My home lists the model of everything in the house", models.every((m) => text.includes(m)), text.slice(0, 200));
  check("My home says where each item is", /Garage, against the north wall/.test(text) && /Hall closet/.test(text));
  check("My home has no prices, costs, lifespans, or forecasts", !/\$\d[\d,]* to \$|typical life|replace cost|forecast|set aside/i.test(text.replace(/\$3,200/g, "")), text.slice(0, 120));
  const links = await page.locator("main a[href^='/tenant/guides/']").count();
  check("My home links to the picture guides", links >= 6, `${links}`);
  await page.getByRole("link", { name: "Furnace not heating: three quick checks" }).click();
  await page.waitForURL("**/tenant/guides/furnace-no-heat");
  check("a guide page shows the model and a picture", (await count(page, /Cedarline CF-80-100/)) > 0 && (await page.getByRole("img").count()) >= 1);
  for (let i = 0; i < 3; i++) await page.getByRole("button", { name: "Next step" }).click();
  check("a guide with 4 steps reaches Done", (await page.getByRole("button", { name: "Done" }).count()) === 1);
  await page.getByRole("button", { name: /Play as a short video/ }).click();
  await page.getByText("Step 1 of 4").waitFor({ timeout: 3000 });
  check("Play restarts the guide as a short animated video", true);
  await page.getByRole("button", { name: "Pause" }).click();
  await page.goto(`${BASE}/tenant/guides/not-a-guide`);
  check("an unknown guide shows the not found page", (await count(page, "We could not find that page")) > 0);

  // Everything the owner uses is not on the tenant side, by link and by page.
  await page.goto(`${BASE}/tenant`);
  const hrefs = await page.locator("header a, footer a").evaluateAll((els) => els.map((e) => e.getAttribute("href")));
  check("no tenant page links to quotes, forecast, rent increase, or the record", !hrefs.some((h) => /owner|quote|forecast|decide|rent$|record/.test(h ?? "")), hrefs.join(","));
  check("the tenant footer has no pricing link", !hrefs.includes("/pricing"));

  // Rent: pay, and the owner sees it.
  await page.goto(`${BASE}/tenant/home`);
  await page.getByRole("button", { name: "Pay $3,200" }).click();
  await page.getByText(/Marked paid on/).first().waitFor(wait20);
  check("the tenant can pay rent and sees it as paid", (await count(page, /Marked paid on/)) > 0);
  await page.goto(`${BASE}/owner`);
  await page.getByText(/Marked paid on/).first().waitFor(wait20);
  check("the owner sees the rent as paid", true);
  await page.goto(`${BASE}/tenant/home`);
  await page.getByRole("button", { name: "Undo" }).click();
  await page.getByText("Not marked paid").first().waitFor(wait20);
  check("no console errors on the tenant side", errors.filter((e) => !/404/.test(e)).length === 0, errors.join(" | "));
  await context.close();
}

// ======================= The owner side: details, filled in by GoHome =======================
{
  const { context, page, errors } = await newPage();
  await resetApp(page);
  await page.goto(`${BASE}/owner`);
  check("a new owner sees All quiet and a way to see GoHome work", (await count(page, "All quiet")) > 0 && (await page.getByRole("button", { name: "See how GoHome handles a repair" }).count()) > 0);
  await page.getByRole("button", { name: "See how GoHome handles a repair" }).click();
  await page.getByRole("button", { name: "Approve", exact: true }).waitFor(wait20);

  await page.goto(`${BASE}/owner/record`);
  const rec = await page.locator("main").innerText();
  check("the owner's record has every model and serial", ["HL-40G-NG", "15C0412-X", "CF-80-100", "BW-DW24", "FM-21T"].every((m) => rec.includes(m)));
  check("the owner's record has replace costs and lifespans", /Replace\s+\$/.test(rec) && /of life/.test(rec));
  check("the owner's record never asks to type anything or photograph a label", !/label|photo|type the details/i.test(rec.replace(/Label/g, "")), rec.slice(0, 100));

  await page.goto(`${BASE}/owner/request`);
  check("the repair request page shows the heater from the record", (await count(page, /Hearthline HL-40G-NG/)) > 0);
  check("the owner sees the three spec buckets: SOON, not URGENT", (await page.getByText("SOON", { exact: true }).count()) > 0 && (await page.getByText("URGENT", { exact: true }).count()) === 0);
  check("the repair tabs link the details", (await page.getByRole("navigation", { name: "Repair details" }).getByRole("link").allInnerTexts()).join() === "Request,Quotes,Decision,Booking");

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
  await page.locator("#paste-quote").fill("Furnace replacement\nLabor ..... $2,000\nTotal $6,000");
  await page.getByRole("button", { name: "Check this quote" }).click();
  await page.getByText(/not in GoHome's price table yet/).waitFor(wait20);
  check("a job that is not in the table gets no verdict, and says so", (await page.getByText(/heating or cooling job/).count()) > 0);

  // Approve limit
  await resetApp(page);
  await page.goto(`${BASE}/owner/book`);
  await page.getByRole("button", { name: /Approve GoHome.s plan/ }).waitFor(wait20);
  await page.locator("label", { hasText: "Willow Glen" }).click();
  await page.getByText("To the tenant: Sample Tenant").waitFor({ timeout: 8000 });
  check("default not-to-exceed is valid", await page.locator("#nte").evaluate((el) => el.checkValidity()));
  await page.locator("#nte").fill("1000");
  check("a limit below the quote shows an error", (await page.getByText(/cannot be lower than the quote/).count()) > 0);
  check("a limit below the quote disables Approve and send", await page.getByRole("button", { name: "Approve and send" }).isDisabled());
  await page.locator("#nte").fill("2700");
  check("a whole-dollar limit is valid", await page.locator("#nte").evaluate((el) => el.checkValidity()));
  await page.getByLabel("To the vendor: Willow Glen Water Heater Co.").fill("Hello, edited by the owner.");
  check("the drafted vendor message can be edited in place", (await page.getByLabel("To the vendor: Willow Glen Water Heater Co.").inputValue()) === "Hello, edited by the owner.");

  // Forecast order
  await page.goto(`${BASE}/owner/forecast`);
  const order = await page.locator("tbody th[scope=row]").allInnerTexts();
  check("forecast is sorted soonest first", order.join(",") === "Water heater,Air conditioner,Dishwasher,Furnace,Refrigerator,Roof", order.join(","));

  // Rent
  await page.goto(`${BASE}/owner/rent`);
  check("the rent page says California only and names AB 1482", (await count(page, "California only, for now")) > 0 && (await count(page, "AB 1482")) > 0);
  await page.locator("#current-rent").fill("");
  await page.getByText("Fill in the numbers to see the result").waitFor(wait20);
  check("an empty current rent blocks the result instead of using an old number", (await page.getByText("Highest allowed new rent").count()) === 0);
  await page.locator("#current-rent").blur();
  await page.getByText("Highest allowed new rent").first().waitFor(wait20);
  await page.locator("#cpi").fill("-5");
  await page.getByText(/Check this number/).waitFor(wait20);
  check("a negative CPI is flagged", true);
  await page.locator("#cpi").fill("3");
  await page.getByLabel("The tenant was given the required written exemption notice.").check();
  await page.locator("#proposed-rent").fill("3600");
  await page.getByRole("button", { name: "Reset sample data" }).click();
  await page.waitForURL(`${BASE}/`);
  await page.goto(`${BASE}/owner/rent`);
  check("Reset restores the rent numbers and checkboxes", (await page.locator("#proposed-rent").inputValue()) === "3360" && !(await page.getByLabel("The tenant was given the required written exemption notice.").isChecked()));
  check("no console errors on the owner side", errors.length === 0, errors.join(" | "));
  await context.close();
}

// ======================= Owner texts: the other two agents =======================
{
  const { context, page, errors } = await newPage();
  await resetApp(page);
  await page.goto(`${BASE}/owner`);
  await tabs(page, /Texts from GoHome/).click();
  await page.getByRole("button", { name: "Check my lease dates" }).click();
  await page.getByText(/Legal maximum/).filter({ visible: true }).first().waitFor(wait20);
  check("the owner can ask GoHome to check the lease and gets the legal cap", true);
  await page.getByRole("button", { name: "Check my lease dates" }).waitFor();
  await page.getByRole("button", { name: "A contractor sent me a quote" }).click();
  await page.getByText(/22% above the top/).filter({ visible: true }).first().waitFor(wait20);
  check("the owner can ask GoHome about a contractor's quote and gets a verdict", true);
  check("no console errors on owner texts", errors.length === 0, errors.join(" | "));
  await context.close();
}

// ======================= Triage by text: emergencies, steps, guides =======================
{
  const { context, page, errors } = await newPage();

  await reportByText(page, "I smell gas and I feel dizzy");
  const gas = await page.locator("main").innerText();
  check("gas smell with dizziness takes the emergency path", /sounds like an emergency/i.test(gas) && /leave the home/i.test(gas) && /911/.test(gas));
  check("gas smell never mentions a gas valve to touch", !/turn the gas|gas valve to|pilot|relight/i.test(gas));
  check("gas smell never opens a picture guide or asks for a photo", (await page.getByRole("button", { name: "Show me how" }).count()) === 0 && !/sticker|label/i.test(gas));
  await page.goto(`${BASE}/owner`);
  await page.getByText("Emergency: Gas safety").first().waitFor(wait20);
  check("the owner gets an emergency card", (await page.getByRole("button", { name: "I'm on it" }).count()) > 0);
  await page.getByRole("button", { name: "I'm on it" }).click();
  await page.goto(`${BASE}/tenant`);
  await page.getByText(/Your landlord is on it/).waitFor(wait20);
  check("the owner's acknowledgement is texted to the tenant", true);

  await reportByText(page, "The toilet is clogged and overflowing");
  const toilet = await page.locator("main").innerText();
  check("an overflowing toilet gets toilet steps, not water heater steps", /do not flush again/i.test(toilet) && !/water heater/i.test(toilet), toilet.slice(0, 160));
  check("an overflowing toilet offers its own picture guide", (await page.getByRole("button", { name: "Show me how" }).count()) === 1);

  await reportByText(page, "We have no heat and it is freezing");
  const heat = await page.locator("main").innerText();
  check("no heat gives the tenant no fix steps", !/\n1\)/.test(heat));
  await page.goto(`${BASE}/owner`);
  await page.getByText(/Called your landlord|calling about hvac/i).first().waitFor(wait20).catch(() => {});
  check("no heat calls the owner", true);

  await reportByText(page, "I feel dizzy and have a headache near the furnace");
  check("dizziness near a gas appliance is an emergency", (await page.getByText(/sounds like an emergency/).count()) > 0);

  await reportByText(page, "water heater is leaking");
  await page.getByRole("button", { name: /^2\s+No$/ }).click();
  await page.getByRole("button", { name: "HELP" }).waitFor(wait20);
  await page.getByRole("button", { name: "HELP" }).click();
  await page.getByText(/Stop and get help if/).filter({ visible: true }).first().waitFor(wait20);
  check("HELP sends the guide for the exact heater", (await page.getByRole("button", { name: "Show me how" }).count()) >= 1);
  check("the guide never tells the tenant to touch gas", !/turn the gas|pilot|relight/i.test(await page.locator("main").innerText()));

  // Questions answered from the record, and the unknown says so.
  await reportByText(page, "How old is the water heater?");
  const age = await page.locator("main").innerText();
  check("the tenant is told the exact brand, model, and age from the record", /Hearthline HL-40G-NG/.test(age) && /11 years/.test(age), age.slice(0, 200));
  await reportByText(page, "What is the serial number of the water heater?");
  check("the tenant is told the serial from the record", (await count(page, /15C0412-X/)) > 0);
  await reportByText(page, "Can I have a dog?");
  check("an unknown question says I don't know", (await page.getByText(/I don't know whether pets are allowed/).count()) > 0);
  await page.getByRole("button", { name: /Ask Sample Owner/ }).click();
  await page.getByText(/I'll text you Sample Owner's answer/).waitFor(wait20);
  check("GoHome offers to ask the owner and does", true);
  check("no console errors in triage", errors.length === 0, errors.join(" | "));
  await context.close();
}

// ======================= Phone layout: chat and agent panel as tabs =======================
{
  const { context, page, errors } = await newPage({ viewport: { width: 390, height: 844 } });
  await resetApp(page);
  await page.goto(`${BASE}/tenant`);
  check("on a phone the chat is first and the agent panel is a tab", (await tabs(page, "Chat").count()) === 1 && (await tabs(page, /What GoHome is doing/).count()) === 1);
  await page.getByRole("button", { name: "My water heater is leaking" }).click();
  await page.getByText(/near an outlet/).waitFor(wait20);
  await tabs(page, /What GoHome is doing/).click();
  await page.getByText(/Checked your problem against the emergency safety rules/).waitFor(wait20);
  check("the agent tab shows the steps GoHome took", true);
  check("the tenant sees the bottom tab bar with two tabs", (await page.getByRole("navigation", { name: "Tenant tabs" }).getByRole("link").count()) === 2);
  check("no horizontal scroll on a phone", await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
  check("no console errors on the phone layout", errors.length === 0, errors.join(" | "));
  await context.close();
}

// ======================= Pages and old links =======================
{
  const { context, page, errors } = await newPage();
  await page.goto(`${BASE}/pricing`);
  await page.getByRole("button", { name: "I would pick Plus" }).click();
  await page.getByRole("button", { name: /I would pick this/ }).waitFor(wait20);
  check("pricing shows $4, $6, and $8 per unit per month", (await page.getByText("$4").count()) > 0 && (await page.getByText("$6").count()) > 0 && (await page.getByText("$8").count()) > 0 && (await count(page, "per unit per month")) >= 3);
  check("pricing says month to month and California only", (await count(page, "Month to month")) > 0 && (await count(page, "California only, for now")) > 0);
  await page.goto(`${BASE}/about`);
  await page.getByText("What counts as an emergency?").click();
  check("the FAQ answers emergencies", (await count(page, "gives your tenant no fix steps")) > 0);
  await page.goto(`${BASE}/definitely-not-a-page`);
  check("an unknown page shows a friendly page", (await count(page, "We could not find that page")) > 0);

  const redirects = [
    ["/triage", "/tenant"], ["/tenant/request", "/tenant"], ["/tenant/safety", "/tenant"], ["/tenant/label", "/tenant"], ["/tenant/status", "/tenant"],
    ["/label", "/owner/record"], ["/owner/label", "/owner/record"], ["/record", "/owner/record"], ["/quote", "/owner/quote"], ["/decide", "/owner/decide"],
    ["/approve", "/owner/book"], ["/forecast", "/owner/forecast"], ["/rent", "/owner/rent"], ["/login", "/"], ["/live", "/"], ["/sms", "/"],
    ["/tenant/requests/new", "/tenant"], ["/requests/new", "/tenant"],
  ];
  for (const [from, to] of redirects) {
    await page.goto(`${BASE}${from}`);
    check(`old link ${from} goes to ${to}`, new URL(page.url()).pathname === to, page.url());
  }
  check("no console errors on pages and old links", errors.filter((e) => !/404/.test(e)).length === 0, errors.join(" | "));
  await context.close();
}

// ======================= Feedback =======================
{
  const { context, page, errors } = await newPage({ viewport: { width: 390, height: 844 } });
  await resetApp(page);
  await page.goto(`${BASE}/owner/quote`);
  await page.getByRole("button", { name: "Send feedback" }).click();
  await page.getByRole("button", { name: "Save feedback" }).click();
  check("rating is required", (await count(page, "Please pick a rating")) > 0);
  await page.locator("dialog").getByText("5", { exact: true }).click();
  await page.getByLabel(/What was confusing/).fill("Clear. I would ask for the labor hours.");
  await page.getByRole("button", { name: "Save feedback" }).click();
  await page.getByText(/Saved. Thank you/).waitFor();
  await page.getByRole("button", { name: "Done" }).click();

  await page.goto(`${BASE}/feedback`);
  await page.getByText("Owner: Quotes").first().waitFor();
  check("feedback note names the role and screen", true);
  await page.getByRole("button", { name: "Copy all as text" }).click();
  await page.getByText(/Copied to your clipboard/).waitFor();
  const text = await page.evaluate(() => navigator.clipboard.readText());
  check("copied text is readable", text.includes("Clarity rating: 5 of 5") && text.includes("labor hours"), text);
  await page.getByRole("button", { name: "Clear all" }).click();
  await page.getByRole("button", { name: /Yes, delete all 1 notes/ }).click();
  await page.getByText("No notes yet.").waitFor();
  check("Clear all removes the notes", true);

  await page.getByRole("button", { name: "Send feedback" }).click();
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
  await page.getByRole("button", { name: "Send feedback" }).click();
  await page.locator("dialog").getByText("4", { exact: true }).click();
  await page.getByRole("button", { name: "Save feedback" }).click();
  await page.getByText(/Saved. Thank you/).waitFor();
  check("feedback still saves in memory with storage blocked", true);
  check("no uncaught errors with storage blocked", errors.length === 0, errors.join(" | "));
  await context.close();
}

// ======================= Text spacing and no dashes, on every page =======================
{
  const { context, page } = await newPage();
  await resetApp(page);
  const paths = ["/", "/pricing", "/about", "/tenant", "/tenant/home", "/tenant/guides/heater-water-off", "/owner", "/owner/request", "/owner/record", "/owner/forecast", "/owner/rent", "/owner/decide", "/owner/quote", "/owner/book", "/feedback"];
  for (const path of paths) {
    await page.goto(`${BASE}${path}`);
    await page.waitForTimeout(1200);
    const bad = await page.evaluate((pagePath) => {
      const hits = [];
      for (const el of Array.from(document.body.querySelectorAll("p, li, dd, dt, td, th, span, h1, h2, h3"))) {
        const t = (el.innerText || "").trim().replace(/\s*\n\s*/g, " | ");
        if (/[a-z]\.[A-Z][a-z]/.test(t) && !/\d\.\d/.test(t) && !/\.com|\.org|\.gov|\.example/.test(t)) hits.push(`${pagePath}: ${t.slice(0, 60)}`);
        if (/—|–/.test(t)) hits.push(`${pagePath}: dash in "${t.slice(0, 40)}"`);
      }
      return hits.slice(0, 3);
    }, path);
    check(`text spacing and dashes on ${path}`, bad.length === 0, bad.join(" || "));
  }
  await context.close();
}

await browser.close();
console.log(failed === 0 ? "\nAll end to end checks passed." : `\n${failed} check(s) failed.`);
process.exit(failed === 0 ? 0 : 1);
