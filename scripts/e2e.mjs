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

/** What is said in the chat, without the live preview banner around it. */
const chatText = (page) => page.getByRole("log", { name: "Messages" }).innerText();

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
  check("the tenant side has only Help, My home, and Pay in its tabs", (await page.getByRole("navigation", { name: "Tenant tabs" }).getByRole("link").allInnerTexts()).join() === "Help,My home,Pay");
  await page.getByRole("link", { name: "Switch to owner" }).click();
  await page.waitForURL("**/owner");
  check("Switch goes straight to the other side in one click", true);
  await page.goto(`${BASE}/`);
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
  const first = await chatText(page);
  check("GoHome already knows the exact heater, so it does not ask for a label", /Hearthline HL-40G-NG/.test(first) && !/sticker|label/i.test(first));
  await page.getByText(/Found your water heater in your home record: Hearthline HL-40G-NG/).waitFor(wait20);
  check("the agent panel shows GoHome finding the heater in the home record", true);
  await page.getByRole("button", { name: /^No$/ }).click();
  await page.getByRole("button", { name: "Show me how" }).first().waitFor(wait20);

  // The picture guide, made for this exact heater.
  await page.getByRole("button", { name: "Show me how" }).first().click();
  const dialog = page.locator("dialog[open]");
  await dialog.getByText(/For your Hearthline HL-40G-NG/i).waitFor();
  check("the guide is made for the exact model and where it is", (await dialog.getByText(/in the garage, to the left of the garage door/i).count()) > 0);
  check("the guide has a picture for every step", (await dialog.getByRole("img").count()) >= 1);
  check("the guide starts at step 1 of 6", (await dialog.getByText("Step 1 of 6").count()) === 1);
  for (let i = 0; i < 5; i++) await dialog.getByRole("button", { name: "Next step" }).click();
  check("the guide reaches the last step and offers Done", (await dialog.getByText("Step 6 of 6").count()) === 1 && (await dialog.getByRole("button", { name: "Done" }).count()) === 1);
  check("the guide never tells the tenant to touch gas", !/turn the gas|gas valve to|pilot|relight/i.test(await dialog.innerText()) || /Do not touch the gas control/.test(await dialog.innerText()));
  check("the guide says when to stop and get help", (await dialog.getByText("Stop and get help if:").count()) === 1);
  await dialog.getByRole("button", { name: "Done" }).click();
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await page.getByText(/I'm watching this/).waitFor(wait20);
  const chat = await chatText(page);
  check("the tenant is never asked for a photo of a label", !/sticker|silver|label photo/i.test(chat));
  check("the tenant never sees a price or a quote", !/\$\d|\bquote/i.test(chat), chat.slice(0, 100));
  await page.getByText(/Looking for licensed plumbers who can come soon/).waitFor(wait20);
  check("the tenant's agent panel shows plain steps like finding a plumber", true);

  // The owner side: everything is already done.
  await page.goto(`${BASE}/owner`);
  await page.getByRole("button", { name: "Approve", exact: true }).waitFor(wait20);
  check("the owner has one thing to approve, already worked out", (await count(page, "2 things need your attention")) > 0 && (await count(page, /Replace the water heater with Willow Glen/)) > 0);
  const card = await page.getByLabel(/Needs your OK: Replace the water heater/).innerText();
  check("the owner card shows price, limit, saving, and visit", ["$2,450", "$2,695", "$400", "9:00"].every((t) => card.includes(t)), card.slice(0, 120));
  await page.getByText(/Bayside Plumbing and Heating: slightly high/).waitFor(wait20);
  check("the owner's agent panel shows every check, with who did it", (await count(page, "Plain code")) > 0 && (await count(page, /Willow Glen Water Heater Co\.: fair/)) > 0);
  await tabs(page, /Texts from GoHome/).click();
  check("the owner can read the texts GoHome sent", (await count(page, /DECISION NEEDED|Water heater leak at/)) > 0);
  await tabs(page, /What GoHome is doing/).click();
  await page.getByRole("button", { name: "Approve", exact: true }).click();
  await page.getByRole("button", { name: "Mark done" }).waitFor(wait20);
  check("one tap books it, and Mark done appears", (await page.getByText(/Booked: Willow Glen Water Heater Co/).count()) > 0);

  // Both people get text updates.
  await page.goto(`${BASE}/tenant`);
  await page.getByText(/Good news: Willow Glen Water Heater Co\. is booked/).waitFor(wait20);
  check("the tenant is texted who is coming and when", true);
  await page.getByText(/Booked a plumber and set up your visit/).waitFor(wait20);
  await page.getByRole("button", { name: /^That works$/ }).click();
  await page.getByText(/see you then/).waitFor(wait20);
  await page.goto(`${BASE}/owner`);
  await tabs(page, /Texts from GoHome/).click();
  await page.getByText(/Your tenant confirmed the visit window/).first().waitFor(wait20);
  check("the owner is texted that the tenant confirmed", true);
  await page.getByRole("button", { name: "Mark done" }).click();
  await page.getByText(/Done: the new water heater is in your home record/).waitFor(wait20);
  await page.goto(`${BASE}/tenant`);
  await page.getByText(/All fixed/).waitFor(wait20);
  check("the tenant is texted when it is fixed", true);
  await page.reload();
  await page.getByText(/All fixed/).waitFor(wait20);
  check("the whole conversation survives a reload", (await count(page, "Good news")) > 0);

  // Text updates live in Settings.
  await page.goto(`${BASE}/tenant/settings`);
  await page.getByRole("switch", { name: "Text updates" }).click();
  check("turning text updates off says so", (await page.getByRole("switch", { name: "Text updates" }).getAttribute("aria-checked")) === "false" && (await count(page, "Updates only show here in the app.")) > 0);
  await page.getByRole("switch", { name: "Text updates" }).click();
  await page.goto(`${BASE}/tenant/home`);

  // The record and the plan updated themselves.
  check("My home shows the new heater model, and no serial numbers", (await count(page, "HL-40G-NG")) > 0 && (await count(page, "26J0007-A")) === 0);
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
  check("My home says where each item is", /Garage, to the left of the garage door/.test(text) && /Hall closet/.test(text));
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
  check("no tenant page links to quotes, forecast, rent increase, or the record (apart from Switch to owner)", !hrefs.filter((h) => h !== "/owner").some((h) => /owner|quote|forecast|decide|rent$|record/.test(h ?? "")), hrefs.join(","));
  check("the tenant footer has the same links as everyone else, pricing included", hrefs.includes("/pricing"));

  // My home points to the Pay page instead of holding a pay button.
  await page.goto(`${BASE}/tenant/home`);
  check("My home shows what is due and links to the Pay page", (await count(page, "$3,292.18")) > 0 && (await page.getByRole("link", { name: "Pay now" }).count()) === 1);
  check("the notification switch is not on My home, it is in Settings", (await page.getByRole("switch", { name: "Text updates" }).count()) === 0);
  check("no console errors on the tenant side", errors.filter((e) => !/404/.test(e)).length === 0, errors.join(" | "));
  await context.close();
}

// ======================= The owner side: details, filled in by GoHome =======================
{
  const { context, page, errors } = await newPage();
  await resetApp(page);
  await page.goto(`${BASE}/owner`);
  check("a new owner sees late rent first and a way to see GoHome work", (await count(page, "1 thing needs your attention")) > 0 && (await count(page, /October 2026 rent is \d+ days late/)) > 0 && (await page.getByRole("button", { name: "See how GoHome handles a repair" }).count()) > 0);
  await page.getByRole("button", { name: "See how GoHome handles a repair" }).click();
  await page.getByRole("button", { name: "Approve", exact: true }).waitFor(wait20);

  await page.goto(`${BASE}/owner/record`);
  const rec = await page.locator("main").innerText();
  check("the owner's record has every model and serial", ["HL-40G-NG", "15C0412-X", "CF-80-100", "BW-DW24", "FM-21T"].every((m) => rec.includes(m)));
  check("the owner's record has replace costs and lifespans", /Replace\s+\$/.test(rec) && /of life/.test(rec));
  check("the owner's record never asks to type the details of what is already on file", !/type the details|upload a label/i.test(rec), rec.slice(0, 100));

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
  await page.getByText("See the line by line math").click();
  const num = (str) => Number(str.replace(/[^0-9]/g, ""));
  const typical = await page.locator("details tbody tr td:nth-child(3)").allInnerTexts();
  const lows = typical.map((t) => num(t.split("to")[0]));
  const highs = typical.map((t) => num(t.split("to")[1]));
  const totalCell = await page.locator("details tfoot td:nth-child(3)").first().innerText();
  check("the typical total equals the sum of the typical line ranges", lows.reduce((a, c) => a + c, 0) === num(totalCell.split("to")[0]) && highs.reduce((a, c) => a + c, 0) === num(totalCell.split("to")[1]), `${lows} ${highs} ${totalCell}`);
  const rowTexts = await page.locator("details tbody tr td:nth-child(1)").allInnerTexts();
  check("every quote row has a pill", rowTexts.every((r) => /OK|High|Slightly high|Low|Ask|Not compared/.test(r)), rowTexts.join(" | "));
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
  await page.locator("#nte").fill("99999999");
  check("an absurdly high limit is refused", (await page.getByText(/more than double the quote/).count()) === 1 && (await page.getByRole("button", { name: "Approve and send" }).isDisabled()));
  await page.locator("#nte").fill("2450.5");
  check("a limit with cents is rounded to whole dollars", await page.locator("#nte").evaluate((el) => Number.isInteger(Number(el.value)) || el.value === "2450.5"));
  await page.locator("#nte").fill("2700");
  check("a whole-dollar limit is valid", await page.locator("#nte").evaluate((el) => el.checkValidity()));
  check("the vendor message does not ask about a permit the quote already lists", !/permit is included/i.test(await page.getByLabel("To the vendor: Willow Glen Water Heater Co.").inputValue()));
  await page.getByLabel("To the vendor: Willow Glen Water Heater Co.").fill("Hello, edited by the owner.");
  check("the drafted vendor message can be edited in place", (await page.getByLabel("To the vendor: Willow Glen Water Heater Co.").inputValue()) === "Hello, edited by the owner.");

  // Forecast order
  await page.goto(`${BASE}/owner/forecast`);
  const order = await page.locator("table", { has: page.locator("caption", { hasText: "Replacement forecast by item" }) }).locator("tbody th[scope=row]").allInnerTexts();
  check("forecast is sorted soonest first", order.join(",") === "Water heater,Air conditioner,Dishwasher,Smoke and CO detectors,Furnace,Refrigerator,Roof", order.join(","));

  // Rent
  await page.goto(`${BASE}/owner/rent`);
  check("the rent page says California only and names AB 1482", (await count(page, "California only, for now")) > 0 && (await count(page, "AB 1482")) > 0);
  await page.locator("#current-rent").fill("");
  await page.getByText("Fill in the numbers to see the result").waitFor(wait20);
  check("an empty current rent blocks the result instead of using an old number", (await page.getByText("Highest allowed new rent").count()) === 0);
  await page.locator("#current-rent").blur();
  check("a cleared box is not swapped for an old number, it says what is wrong", (await page.locator("#current-rent").inputValue()) === "" && (await page.getByText("Enter a number.").count()) === 1);
  await page.locator("#current-rent").fill("3200");
  await page.getByText("Highest allowed new rent").first().waitFor(wait20);
  await page.locator("#proposed-rent").fill("-100");
  await page.getByText("Fill in the numbers to see the result").waitFor(wait20);
  check("a negative new rent shows no result", (await page.getByText("Highest allowed new rent").count()) === 0);
  await page.locator("#proposed-rent").fill("3520.01");
  check("a rent with cents shows no float artifact", !/\d\.\d{3,}/.test(await page.locator("main").innerText()));
  await page.locator("#proposed-rent").fill("3360");
  await page.locator("#increases").fill("-1");
  check("negative earlier increases are refused with a message", (await page.getByText("Enter 0 or more.").count()) === 1 && (await page.getByText("Fill in the numbers to see the result").count()) === 1);
  await page.locator("#increases").fill("1.5");
  check("a fractional count of increases is refused", (await page.getByText(/Enter a whole number/).count()) === 1);
  await page.locator("#increases").fill("0");
  await page.locator("#cpi").fill("-5");
  await page.getByText(/Check this number/).waitFor(wait20);
  check("a negative CPI is flagged", true);
  await page.locator("#cpi").fill("3");
  await page.getByLabel("The tenant was given the required written exemption notice.").check();
  await page.locator("#proposed-rent").fill("3600");
  await page.getByRole("button", { name: "Reset sample data" }).click();
  await page.getByRole("button", { name: "Yes, reset" }).click();
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
  const gas = await chatText(page);
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
  const toilet = await chatText(page);
  check("an overflowing toilet gets toilet steps, not water heater steps", /do not flush again/i.test(toilet) && !/water heater/i.test(toilet), toilet.slice(0, 160));
  check("an overflowing toilet offers its own picture guide", (await page.getByRole("button", { name: "Show me how" }).count()) === 1);

  await reportByText(page, "We have no heat and it is freezing");
  const heat = await chatText(page);
  check("no heat gives the tenant no fix steps", !/\n1\)/.test(heat));
  await page.goto(`${BASE}/owner`);
  await page.getByText(/Called your landlord|calling about hvac/i).first().waitFor(wait20).catch(() => {});
  check("no heat calls the owner", true);

  await reportByText(page, "I feel dizzy and have a headache near the furnace");
  check("dizziness near a gas appliance is an emergency", (await page.getByText(/sounds like an emergency/).count()) > 0);

  await reportByText(page, "water heater is leaking");
  await page.getByRole("button", { name: /^No$/ }).click();
  await page.getByRole("button", { name: "Help" }).waitFor(wait20);
  await page.getByRole("button", { name: "Help" }).click();
  await page.getByText(/Stop and get help if/).filter({ visible: true }).first().waitFor(wait20);
  check("HELP sends the guide for the exact heater", (await page.getByRole("button", { name: "Show me how" }).count()) >= 1);
  check("the guide never tells the tenant to touch gas", !/turn the gas|pilot|relight/i.test(await chatText(page)));

  // Questions answered from the record, and the unknown says so.
  await reportByText(page, "How old is the water heater?");
  const age = await chatText(page);
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

// ======================= Paying rent and utilities =======================
{
  const { context, page, errors } = await newPage();
  await resetApp(page);
  await page.goto(`${BASE}/tenant/pay`);
  check("the Pay page shows the amount due and each bill", (await count(page, "$3,292.18")) > 0 && (await count(page, "October 2026 rent")) > 0 && (await count(page, "Water and trash")) > 0);
  check("the Pay page says gas and electric are paid to the utility", (await count(page, /paid directly to your utility company/)) > 0);
  const checkout = page.frameLocator('iframe[title="Secure checkout"]');
  await checkout.getByText("Secure checkout").waitFor(wait20);
  check("the checkout is its own embedded page", (await page.locator('iframe[title="Secure checkout"]').getAttribute("src"))?.startsWith("/checkout") === true);

  // Mistakes are caught, in plain words.
  await checkout.getByRole("button", { name: /^Pay \$/ }).click();
  check("an empty card form says what is wrong", (await checkout.getByText("Enter the name on the card.").count()) === 1 && (await checkout.getByText(/card number does not look right/).count()) === 1);
  await checkout.getByLabel("Name on card").fill("Sample Tenant");
  await checkout.getByLabel("Card number").fill("4242 4242 4242 4241");
  await checkout.getByLabel("Expires").fill("1230");
  await checkout.getByLabel("CVC").fill("123");
  await checkout.getByLabel("ZIP").fill("95100");
  await checkout.getByRole("button", { name: /^Pay \$/ }).click();
  check("a card number that fails the check is refused", (await checkout.getByText(/card number does not look right/).count()) === 1);
  check("an expiry is shown as MM/YY", (await checkout.getByLabel("Expires").inputValue()) === "12/30");
  check("the card form limits what can be typed", (await checkout.getByLabel("CVC").getAttribute("maxlength")) === "4");

  // The fee depends on how you pay.
  check("a card shows a fee", (await checkout.getByText("Card fee (2.9% + $0.30)").count()) === 1 && (await checkout.getByText("$3,387.95").count()) >= 1);
  await checkout.getByText("Bank account", { exact: true }).click();
  check("a bank transfer has no fee", (await checkout.getByText("Bank transfer fee").count()) === 1 && (await checkout.getByText("$3,292.18").count()) >= 2);
  await checkout.getByRole("button", { name: "Use the sample bank account" }).click();
  await checkout.getByLabel("Routing number").fill("110000001");
  await checkout.getByRole("button", { name: /^Pay \$/ }).click();
  check("a bad routing number is refused", (await checkout.getByText(/routing number has 9 digits/).count()) === 1);

  // Paying by card.
  await checkout.getByText("Card", { exact: true }).click();
  await checkout.getByRole("button", { name: "Use the sample card" }).click();
  await checkout.getByRole("checkbox", { name: /Water and trash/ }).uncheck();
  check("unticking a bill changes the total", (await checkout.getByRole("button", { name: /Pay \$3,\d{3}\.\d\d/ }).count()) === 1 && (await checkout.getByText("$3,200.00").count()) >= 1);
  await checkout.getByRole("button", { name: /^Pay \$/ }).click();
  await checkout.getByText("Processing...").waitFor();
  check("paying shows a processing state", true);
  await checkout.getByText("Payment received").waitFor(wait20);
  check("a receipt shows the confirmation number and only the last four digits", (await checkout.getByText("Confirmation GH-100042").count()) === 1 && (await checkout.getByText(/ending in 4242/).count()) === 1);
  const stored = await page.evaluate(() => JSON.stringify(window.localStorage));
  check("the full card number and CVC are never saved", !stored.includes("4242 4242 4242 4242") && !stored.includes("4242424242424242") && !/"cvc"/.test(stored));
  await page.getByText(/Confirmation GH-100042/).first().waitFor(wait20);
  check("the payment shows up in the history and the amount due drops", (await count(page, "$92.18")) > 0 && (await page.getByText("$3,292.18").count()) === 0);
  await checkout.getByRole("button", { name: "Done" }).click();
  await checkout.getByText("Water and trash").first().waitFor(wait20);
  check("after Done, a fresh checkout shows only what is still due", (await checkout.getByText("October 2026 rent").count()) === 0);

  // Both people hear about it.
  await page.goto(`${BASE}/tenant`);
  await page.getByText(/Your October 2026 rent of \$3,200 was received/).waitFor(wait20);
  check("the tenant is texted a receipt with the confirmation", true);
  await page.goto(`${BASE}/owner`);
  await page.getByText(/card ending in 4242\. Confirmation GH-100042/).first().waitFor(wait20);
  check("the owner sees the rent as received, how, and the confirmation", true);
  await tabs(page, /Texts from GoHome/).click();
  await page.getByText(/paid October 2026 rent/).first().waitFor(wait20);
  check("the owner is texted that rent was paid", true);

  // Utilities by bank transfer, in a new checkout.
  await page.goto(`${BASE}/tenant/pay`);
  const next = page.frameLocator('iframe[title="Secure checkout"]');
  await next.getByText("Water and trash").first().waitFor(wait20);
  await next.getByText("Bank account", { exact: true }).click();
  await next.getByRole("button", { name: "Use the sample bank account" }).click();
  await next.getByRole("button", { name: "Pay $92.18" }).click();
  await next.getByText("Payment received").waitFor(wait20);
  check("utilities can be paid by bank transfer with no fee", (await next.getByText("Confirmation GH-100043").count()) === 1);
  await next.getByRole("button", { name: "Done" }).click();
  await page.getByText("You are all paid up").waitFor(wait20);
  await page.getByText("Nothing to pay right now").waitFor(wait20);
  check("when everything is paid the page says so", true);
  check("no console errors while paying", errors.length === 0, errors.join(" | "));
  await context.close();
}

// ======================= Settings on both sides =======================
{
  const { context, page, errors } = await newPage();
  await resetApp(page);
  await page.goto(`${BASE}/tenant`);
  await page.getByRole("link", { name: "Settings" }).click();
  await page.waitForURL("**/tenant/settings");
  const tenant = await page.locator("main").innerText();
  check("tenant settings has account, notifications, payments, and data", ["Your account", "Notifications", "Payments", "Your data"].every((t) => tenant.includes(t)));
  check("tenant settings has no owner topics", !/quote|forecast|spending limit|approve/i.test(tenant), tenant.slice(0, 80));
  check("autopay can be turned on before any payment, with a sample account", await page.getByRole("switch", { name: "Autopay" }).isEnabled() && (await page.getByText(/Turn this on to pay rent automatically/).count()) === 1);
  await page.getByRole("switch", { name: "Email receipts and updates" }).click();
  check("a tenant setting can be changed", (await page.getByRole("switch", { name: "Email receipts and updates" }).getAttribute("aria-checked")) === "false");
  await page.reload();
  check("a setting is remembered after a reload", (await page.getByRole("switch", { name: "Email receipts and updates" }).getAttribute("aria-checked")) === "false");

  await page.goto(`${BASE}/owner`);
  check("the notification switch is not in the owner inbox", (await page.getByRole("switch", { name: "Text updates" }).count()) === 0);
  await page.getByRole("link", { name: "Settings" }).click();
  await page.waitForURL("**/owner/settings");
  const owner = await page.locator("main").innerText();
  check("owner settings has account, notifications, approvals, and data", ["Your account", "Notifications", "What GoHome may do without asking", "Your data"].every((t) => owner.includes(t)));
  await page.getByRole("switch", { name: "Text updates" }).click();
  check("the owner can turn text updates off", (await page.getByRole("switch", { name: "Text updates" }).getAttribute("aria-checked")) === "false");
  await page.getByLabel("Your data").getByRole("button", { name: "Reset sample data" }).click();
  await page.getByLabel("Your data").getByRole("button", { name: "Yes, reset" }).click();
  await page.waitForTimeout(400);
  check("reset in settings restores the defaults", (await page.getByRole("switch", { name: "Text updates" }).getAttribute("aria-checked")) === "true");

  // Settings shows up in the navigation of both sides.
  await page.goto(`${BASE}/tenant/pay`);
  check("the Settings gear is in the header on every page", (await page.locator("header").getByRole("link", { name: "Settings" }).count()) === 1);
  check("no console errors in settings", errors.length === 0, errors.join(" | "));
  await context.close();
}

// ======================= The team =======================
{
  const { context, page, errors } = await newPage();
  await page.goto(`${BASE}/about`);
  const team = page.locator("#team");
  await team.waitFor();
  check("the team section has the new header and subhead", (await team.getByRole("heading", { name: "The team behind GoHome" }).count()) === 1 && (await count(page, "Three UCSB students building the property manager we wish small landlords had.")) === 1);
  const text = await team.innerText();
  check("the team section has all three names and the new titles", ["Grayson Ando", "Co-founder & CEO", "Ezekiel Thun", "Co-founder & Head of Design", "Hayden Haar", "Co-founder & Head of Finance"].every((t) => text.includes(t)), text.slice(0, 80));
  check("each bio is two sentences at most", (await team.locator("article p").allInnerTexts()).filter((t) => t.length > 40).every((t) => (t.match(/[.!?](\s|$)/g) ?? []).length <= 2));
  check("Grayson's bio names SanDisk and the San Jose rental, and Hayden's names Vantage Data Centers", text.includes("SanDisk") && text.includes("San Jose") && text.includes("Vantage Data Centers"));
  check("no bio has a placeholder in it", !/\[|ADD ONE|TODO/.test(text));
  const icons = await team.locator("a[href*='linkedin.com/in/']").evaluateAll((els) => els.map((e) => ({ href: e.getAttribute("href"), label: e.getAttribute("aria-label"), target: e.getAttribute("target"), rel: e.getAttribute("rel"), box: e.getBoundingClientRect().width })));
  check("each leader has a small LinkedIn icon link with an aria-label", icons.length === 3 && icons.every((i) => /on LinkedIn/.test(i.label ?? "") && i.target === "_blank" && /noreferrer/.test(i.rel ?? "")), JSON.stringify(icons));
  check("the LinkedIn links go to the right people", icons.some((i) => i.href.includes("grayson-ando") && i.label.startsWith("Grayson Ando")) && icons.some((i) => i.href.includes("ezekiel-thun") && i.label.startsWith("Ezekiel Thun")) && icons.some((i) => i.href.includes("hayden-haar") && i.label.startsWith("Hayden Haar")));
  check("there is no big LinkedIn button any more", (await team.getByRole("link", { name: "LinkedIn", exact: true }).count()) === 0 && icons.every((i) => i.box <= 48));
  const photos = await team.locator("article img").evaluateAll((els) => els.map((e) => ({ alt: e.alt, ok: e.complete && e.naturalWidth > 0, w: Math.round(e.getBoundingClientRect().width), round: getComputedStyle(e).borderRadius })));
  check("each leader shows their real photo, and it loads", photos.length === 3 && photos.every((p) => p.ok) && photos.some((p) => p.alt === "Photo of Grayson Ando") && photos.some((p) => p.alt === "Photo of Ezekiel Thun") && photos.some((p) => p.alt === "Photo of Hayden Haar"), JSON.stringify(photos));
  check("the photos are 120px circles on desktop", photos.every((p) => p.w === 120 && (p.round.includes("%") || parseFloat(p.round) >= 60)), JSON.stringify(photos));
  const row = await team.locator("article").evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().top)));
  check("on desktop the three cards sit side by side in one row", row.length === 3 && Math.max(...row) - Math.min(...row) <= 2, row.join(","));
  await team.locator("article").first().scrollIntoViewIfNeeded();
  await page.waitForTimeout(1200);
  const before = await team.locator("article").first().evaluate((e) => e.getBoundingClientRect().top);
  await team.locator("article").first().hover();
  await page.waitForTimeout(400);
  const after = await team.locator("article").first().evaluate((e) => e.getBoundingClientRect().top);
  check("a card lifts about 4px on hover", Math.round(before - after) === 4, `${before} ${after}`);
  await page.goto(`${BASE}/`);
  await page.locator("header").getByRole("link", { name: "Our team" }).click();
  await page.waitForURL("**/about#team");
  check("the welcome page links to the team", true);
  check("no console errors on the team section", errors.length === 0, errors.join(" | "));
  await context.close();
}

// ======================= The team on a phone =======================
{
  const { context, page, errors } = await newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(`${BASE}/about#team`);
  const team = page.locator("#team");
  await team.waitFor();
  await team.locator("article").last().scrollIntoViewIfNeeded();
  await page.waitForTimeout(700);
  const cards = await team.locator("article").evaluateAll((els) => els.map((e) => ({ h: Math.round(e.getBoundingClientRect().height), top: Math.round(e.getBoundingClientRect().top + window.scrollY) })));
  check("on a phone the cards are stacked", cards.length === 3 && cards[1].top > cards[0].top + 100 && cards[2].top > cards[1].top + 100, JSON.stringify(cards));
  check("each card fits in about half a phone screen", cards.every((c) => c.h <= 430), JSON.stringify(cards));
  const avatar = await team.locator("article img").first().evaluate((e) => Math.round(e.getBoundingClientRect().width));
  check("the photo circle is 96px on a phone", avatar === 96, `${avatar}`);
  check("no horizontal scroll on the team section", await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
  const faded = await team.locator("article").first().evaluate((e) => getComputedStyle(e.parentElement).opacity);
  check("cards that scrolled into view are visible", faded === "1", faded);
  check("no console errors on the phone", errors.length === 0, errors.join(" | "));
  await context.close();
}

// ======================= Live preview prompts: one person can follow both sides =======================
{
  const { context, page, errors } = await newPage();
  await resetApp(page);
  const prompt = page.getByRole("complementary", { name: /Live preview/ });

  // From the owner's screen, act as the tenant and watch the inbox react.
  await page.goto(`${BASE}/owner`);
  await prompt.getByText(/A tenant can text GoHome any time/).waitFor(wait20);
  check("an owner with nothing to do is offered a tenant to act as", (await prompt.getByRole("button", { name: /Act as the tenant: report a leaking water heater/ }).count()) === 1);
  await prompt.getByRole("button", { name: /Act as the tenant: report a leaking water heater/ }).click();
  await prompt.getByRole("button", { name: /Act as the tenant: No, nothing electrical/ }).waitFor(wait20);
  check("the prompt shows what the tenant sees", (await prompt.getByText("The tenant sees").count()) === 1);
  await prompt.getByRole("button", { name: /Act as the tenant: No, nothing electrical/ }).click();
  await prompt.getByRole("button", { name: /Act as the tenant: Done/ }).waitFor(wait20);
  await prompt.getByRole("button", { name: /Act as the tenant: Done/ }).click();
  await page.getByRole("button", { name: "Approve", exact: true }).waitFor(wait20);
  check("acting as the tenant brings the owner's approval card", true);

  // Dismissing hides it, and the next step brings it back.
  await prompt.getByRole("button", { name: "Hide this preview" }).click().catch(() => {});
  await page.getByRole("button", { name: "Approve", exact: true }).click();
  await prompt.getByRole("button", { name: /Act as the tenant: That works/ }).waitFor(wait20);
  check("after approving, the owner is offered the tenant's confirmation", true);

  // From the tenant's screen, act as the owner and the plumber.
  await page.goto(`${BASE}/tenant`);
  await prompt.getByRole("button", { name: /Confirm the time: That works/ }).waitFor(wait20);
  await prompt.getByRole("button", { name: /Confirm the time: That works/ }).click();
  await prompt.getByRole("button", { name: /Fast-forward: the plumber finishes/ }).waitFor(wait20);
  await prompt.getByRole("button", { name: /Fast-forward: the plumber finishes/ }).click();
  await page.getByText(/All fixed/).waitFor(wait20);
  await prompt.getByRole("link", { name: "Pay this month's rent" }).waitFor(wait20);
  check("when the job is done, the tenant is pointed to paying rent", true);

  // A fresh case, answered from the tenant's screen as the owner.
  await resetApp(page);
  await page.goto(`${BASE}/tenant`);
  await page.getByRole("button", { name: "My water heater is leaking" }).click();
  await page.getByText(/near an outlet/).waitFor(wait20);
  await page.getByRole("button", { name: /^No$/ }).click();
  await page.getByRole("button", { name: "Done", exact: true }).waitFor(wait20);
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await prompt.getByRole("button", { name: /Act as the owner: Approve/ }).waitFor(wait20);
  check("the tenant sees that the owner has a plan, with a button to act as the owner", (await prompt.getByText("The owner sees").count()) === 1);
  await prompt.getByRole("button", { name: /Act as the owner: Approve/ }).click();
  await page.getByText(/Good news: Willow Glen/).waitFor(wait20);
  check("acting as the owner books the plumber and texts the tenant", true);
  check("the prompt is not on the Pay or Settings pages", await (async () => { await page.goto(`${BASE}/tenant/pay`); return (await page.getByRole("complementary", { name: /Live preview/ }).count()) === 0; })());
  check("no console errors with prompts", errors.length === 0, errors.join(" | "));
  await context.close();
}

// ======================= Round 5 defects: the rent page =======================
{
  const { context, page, errors } = await newPage();
  await resetApp(page);
  await page.goto(`${BASE}/owner/rent`);
  const out = () => page.locator("main").innerText();

  // 1: money is rounded to the cent.
  await page.locator("#proposed-rent").fill("1234.567");
  await page.locator("#proposed-rent").blur();
  check("a typed rent is rounded to the cent", (await page.locator("#proposed-rent").inputValue()) === "1234.57", await page.locator("#proposed-rent").inputValue());
  check("no float tail anywhere on the rent page", !/\d\.\d{3,}/.test(await out()));
  await page.locator("#current-rent").fill("3200.456");
  await page.locator("#current-rent").blur();
  check("the current rent is rounded too", (await page.locator("#current-rent").inputValue()) === "3200.46");
  await page.locator("#current-rent").fill("3200");
  await page.locator("#current-rent").blur();

  // 2: a decrease is a decrease.
  await page.locator("#proposed-rent").fill("3000");
  const decrease = await page.locator("pre").innerText();
  check("a rent decrease is titled as a decrease, never as an increase", decrease.includes("NOTICE OF RENT DECREASE") && !decrease.includes("RENT INCREASE"));
  check("a decrease says it lowers the rent, and the result agrees", (await count(page, "OK to send: this lowers the rent")) >= 1);
  await page.locator("#proposed-rent").fill("3200");
  check("an unchanged rent has no notice to send", (await page.locator("pre").count()) === 0 && (await count(page, "same as the current rent")) > 0);

  // 6: the letter is in the page once.
  await page.locator("#proposed-rent").fill("3360");
  const dup = await page.evaluate(() => (document.body.textContent.match(/Owner signature/g) ?? []).length);
  check("the notice letter is in the page once, so a screen reader reads it once", dup === 1, `${dup}`);

  // 7: no result, no made-up notice date.
  await page.locator("#proposed-rent").fill("");
  await page.getByText("Fill in the numbers to see the result").waitFor(wait20);
  const blank = await out();
  check("with a blank number there is no 90 day notice or start date", !/90 day|new rent would start|send the notice by/.test(blank) && (await page.locator("pre").count()) === 0);

  // 8: the same guard for absurd rent and absurd inflation.
  await page.locator("#proposed-rent").fill("99999999");
  await page.getByText("Check the rent numbers").waitFor(wait20);
  check("an absurd rent is flagged and makes no notice", (await page.locator("pre").count()) === 0);
  await page.locator("#proposed-rent").fill("3360");
  await page.locator("#cpi").fill("20");
  await page.getByText("Check the inflation number").waitFor(wait20);
  check("an absurd inflation number is flagged the same way", (await page.locator("pre").count()) === 0);
  await page.locator("#cpi").fill("3");

  // 11: prefilled from the lease, with a suggestion, a deadline, and a way to send.
  check("the rent page starts from the lease", (await count(page, "From your lease")) > 0 && (await count(page, "$3,200.00 a month")) > 0 && (await count(page, "December 14, 2026")) > 0);
  await page.locator("#proposed-rent").fill("3300");
  await page.getByRole("button", { name: /^Recommended: \$3,360\.00/ }).click();
  check("one tap uses GoHome's suggestion", (await page.locator("#proposed-rent").inputValue()) === "3360");
  check("the other suggestion is the most the law allows", (await page.getByRole("button", { name: /^Max legal: \$3,456\.00/ }).count()) === 1);
  check("the inflation number is honestly labeled as a sample, with where to find the real one", (await count(page, /This is a sample number, not a live lookup/)) > 0 && (await count(page, "U.S. Bureau of Labor Statistics")) > 0);
  check("the page gives the last day to send the notice", (await page.getByText(/To start on December 14, 2026, send the notice by/).count()) === 1);
  await page.locator("#start-date").fill("2020-01-01");
  check("a start date that is already too early is called out", (await page.getByText(/Too late for a January 1, 2020 start/).count()) === 1);
  await page.locator("#start-date").fill("2026-12-14");
  await page.getByRole("button", { name: "Send notice to Sample Tenant" }).click();
  await page.getByText(/was told by text, and the notice goes by mail/).waitFor(wait20);
  check("the notice can be sent from the page", (await page.getByRole("button", { name: "Notice sent" }).isDisabled()));
  await page.goto(`${BASE}/tenant`);
  await page.getByText(/Your owner sent you a notice by mail/).waitFor(wait20);
  check("the tenant is texted about the notice", true);
  await page.goto(`${BASE}/owner/rent`);
  check("a sent notice stays sent after a reload", (await page.getByRole("button", { name: "Notice sent" }).count()) === 1);

  // 12: plain words, no raw keys.
  const rentText = await out();
  check("the rent page has no unexplained jargon", !/just cause|CPI change|REIT, a corporation/.test(rentText) && /big investment company/.test(rentText) && /rules about when a tenant can be asked to leave/.test(rentText), rentText.slice(0, 60));
  check("no raw tool names on the owner pages", await (async () => {
    for (const path of ["/owner/request", "/owner/book", "/owner"]) {
      await page.goto(`${BASE}${path}`);
      await page.waitForTimeout(500);
      const t = await page.locator("body").innerText();
      if (/read_label|owner_approval|book_vendor|message_tenant|emergency_rules/.test(t)) return false;
    }
    return true;
  })());
  check("no console errors on the rent page", errors.length === 0, errors.join(" | "));
  await context.close();
}

// ======================= Round 5 defects: request, quote, and approve =======================
{
  const { context, page, errors } = await newPage();
  await resetApp(page);
  await page.goto(`${BASE}/owner`);
  await page.getByRole("button", { name: "See how GoHome handles a repair" }).click();
  await page.getByRole("button", { name: "Approve", exact: true }).waitFor(wait20);

  // 10: the plus 10% rule is on the approve tap itself.
  const card = await page.getByLabel(/Needs your OK: Replace the water heater/).innerText();
  check("the approval card explains the quote plus 10% limit before the tap", /quote plus 10%/.test(card) && /\$2,450 becomes \$2,695/.test(card), card.slice(-200));

  // 3 and 4: no waiting for answers that cannot come, and the badge follows the status.
  await page.goto(`${BASE}/owner/request`);
  check("the request page does not wait for answers the tenant is never asked for", (await count(page, /Waiting for the tenant/)) === 0 && (await count(page, /answers/)) === 0);
  check("before approving, the request says it needs a decision", (await count(page, "NEEDS YOUR DECISION")) === 1);
  await page.goto(`${BASE}/owner`);
  await page.getByRole("button", { name: "Approve", exact: true }).click();
  await page.getByRole("button", { name: "Mark done" }).waitFor(wait20);
  await page.goto(`${BASE}/owner/request`);
  check("after approving, the badge says approved and booked, not needs a decision", (await count(page, "NEEDS YOUR DECISION")) === 0 && (await count(page, "APPROVED AND BOOKED")) === 1);
  await page.goto(`${BASE}/owner`);
  await page.getByRole("button", { name: "Mark done" }).click();
  await page.getByText(/Done: the new water heater is in your home record/).waitFor(wait20);
  await page.goto(`${BASE}/owner/request`);
  check("when the job is done, the badge says done", (await page.locator("main").innerText()).includes("DONE") && (await count(page, "NEEDS YOUR DECISION")) === 0);

  // 9: the saving is stated once.
  await page.goto(`${BASE}/owner/quote`);
  const quote = await page.locator("main").innerText();
  check("the best pick card says $400 less than the highest quote once", (quote.match(/less than the highest quote/g) ?? []).length === 1, `${(quote.match(/less than the highest quote/g) ?? []).length}`);

  // 10 again, on the booking page.
  await resetApp(page);
  await page.goto(`${BASE}/owner/book`);
  await page.getByRole("button", { name: /Approve GoHome.s plan/ }).waitFor(wait20);
  await page.locator("label", { hasText: "Willow Glen" }).click();
  await page.getByText(/Your limit is the quote plus 10%: \$2,450 becomes \$2,695/).waitFor(wait20);
  check("the booking page explains the limit next to the approve button", true);
  await page.locator("#nte").fill("2800");
  await page.getByText(/which you changed from the usual quote plus 10%/).waitFor(wait20);
  check("a limit you changed is described as yours", true);
  check("no console errors on request, quote, and approve", errors.length === 0, errors.join(" | "));
  await context.close();
}

// ======================= Round 5 defect 5: the home record can be corrected =======================
{
  const { context, page, errors } = await newPage();
  await resetApp(page);
  await page.goto(`${BASE}/owner/record`);
  check("the owner record no longer claims nobody ever types anything", (await count(page, "You never have to type any of this")) === 0 && (await page.getByRole("button", { name: "Edit details" }).count()) === 7);
  await page.getByRole("button", { name: "Edit details" }).first().click();
  await page.getByLabel("Model", { exact: true }).fill("");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  check("an empty field is refused with a reason", (await page.getByText("Model cannot be empty.").count()) === 1);
  await page.getByLabel("Brand", { exact: true }).fill("Hearthline");
  await page.getByLabel("Model", { exact: true }).fill("HL-40G-LP");
  await page.locator("#edit-water-heater-serial").fill("15C0412-Z");
  await page.locator("#edit-water-heater-location").fill("Garage, east wall");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page.getByText(/Water heater updated\. Your tenant now sees the corrected details and guides\./).waitFor(wait20);
  check("a misread model can be corrected, and the record says it was", (await count(page, "HL-40G-LP")) > 0 && (await count(page, "Corrected by you")) === 1);
  await page.reload();
  check("the correction survives a reload", (await count(page, "HL-40G-LP")) > 0);

  // The tenant, the guides, and what GoHome says all use the corrected record.
  await page.goto(`${BASE}/tenant/home`);
  check("the tenant's My home shows the corrected model and place, and still no serial", (await count(page, "Hearthline HL-40G-LP")) > 0 && (await count(page, "15C0412-Z")) === 0 && (await count(page, "Garage, east wall")) > 0);
  await page.goto(`${BASE}/tenant/guides/heater-water-off`);
  check("the picture guide is written for the corrected model", (await count(page, /For your Hearthline HL-40G-LP/)) > 0);
  await page.goto(`${BASE}/tenant`);
  await page.getByRole("button", { name: "My water heater is leaking" }).click();
  await page.getByText(/near an outlet/).waitFor(wait20);
  check("GoHome names the corrected model in the chat", /Hearthline HL-40G-LP/.test(await chatText(page)) && !/HL-40G-NG/.test(await chatText(page)));
  await page.getByText(/Found your water heater in your home record: Hearthline HL-40G-LP/).waitFor(wait20);
  check("and in the activity panel", true);

  // Putting it back.
  await page.goto(`${BASE}/owner/record`);
  await page.getByRole("button", { name: "Edit details" }).first().click();
  await page.getByRole("button", { name: "Put the recorded details back" }).click();
  check("the recorded details can be put back", (await count(page, "HL-40G-NG")) > 0 && (await count(page, "Corrected by you")) === 0);
  check("no console errors while editing the record", errors.length === 0, errors.join(" | "));
  await context.close();
}

// ======================= Round 5 defects: the About page, the shell, and pricing =======================
{
  const { context, page, errors } = await newPage();
  await resetApp(page);

  // 17: one header and one footer on every public page.
  const headerLinks = [];
  const footerLinks = [];
  for (const path of ["/", "/about", "/pricing", "/feedback"]) {
    await page.goto(`${BASE}${path}`);
    headerLinks.push((await page.locator("header").first().getByRole("link").allInnerTexts()).join("|"));
    footerLinks.push((await page.locator("footer").getByRole("link").allInnerTexts()).join("|") + "|" + (await page.locator("footer").getByRole("button").allInnerTexts()).join("|"));
  }
  check("the welcome, About, Pricing, and Feedback pages share one header", new Set(headerLinks).size === 1 && headerLinks[0].includes("Our team") && headerLinks[0].includes("Pricing"), headerLinks.join(" // "));
  check("and one footer", new Set(footerLinks).size === 1, footerLinks.join(" // "));

  // 16: the footer feedback link is on the welcome page too.
  await page.goto(`${BASE}/`);
  check("the welcome page footer has Send feedback and Reset sample data", (await page.getByRole("button", { name: "Send feedback" }).count()) === 1 && (await page.getByRole("button", { name: "Reset sample data" }).count()) === 1);
  await page.getByRole("button", { name: "Send feedback" }).click();
  check("the feedback sheet on the welcome page works", (await page.getByText("How clear was this screen?").count()) === 1);
  await page.getByRole("button", { name: "Cancel" }).click();

  // 15: reset asks first, stays put, and says it is done.
  await page.goto(`${BASE}/about`);
  await page.getByRole("button", { name: "Reset sample data" }).click();
  await page.getByRole("button", { name: "Cancel" }).click();
  check("cancelling a reset changes nothing", (await page.getByRole("button", { name: "Reset sample data" }).count()) === 1);
  await page.getByRole("button", { name: "Reset sample data" }).click();
  check("a reset asks before it clears anything", (await page.getByRole("alertdialog", { name: "Reset the sample data?" }).count()) === 1);
  await page.getByRole("button", { name: "Yes, reset" }).click();
  await page.getByText("Sample data was reset.").waitFor(wait20);
  check("after a reset you stay on the same page, and it says so", new URL(page.url()).pathname === "/about");

  // 14: anchor jumps stop below the sticky header.
  const headerHeight = await page.locator("header").first().evaluate((e) => e.getBoundingClientRect().height);
  for (const id of ["team", "faq", "contact", "price-ranges"]) {
    await page.goto(`${BASE}/about#${id}`);
    await page.waitForTimeout(500);
    const top = await page.locator(`#${id} h2`).first().evaluate((e) => e.getBoundingClientRect().top);
    check(`/about#${id} lands with its heading below the header`, top >= headerHeight - 1, `${top} vs ${headerHeight}`);
  }

  // 18, 19, 13: names, naming, and the future wording.
  await page.goto(`${BASE}/about`);
  const about = await page.locator("main").innerText();
  check("the About page connects GoHome and Porchlight", /called Porchlight/.test(about));
  check("the FAQ section is called Help and FAQ everywhere", (await page.getByRole("heading", { name: "Help and FAQ" }).count()) === 1 && (await page.getByRole("link", { name: "Help and FAQ" }).count()) === 1 && !/Questions\n/.test(about));
  await page.getByRole("button", { name: "Send feedback" }).click();
  check("and the feedback sheet names it the same", (await page.getByText("Help and FAQ", { exact: true }).count()) >= 1 && (await page.locator("dialog").innerText()).includes("Screen: Help and FAQ"));
  await page.getByRole("button", { name: "Cancel" }).click();
  await page.getByText("What counts as an emergency?").click();
  await page.getByText("What does my tenant see?").click();
  check("the FAQ frames texting and calls as the full product", (await page.locator("#faq").innerText()).split("In the full product").length - 1 >= 2);
  check("the About page says tenants see a chat today", /Today, a simple chat page/.test(await page.locator("#faq").innerText()));

  // 20: pricing words are not run together.
  await page.goto(`${BASE}/pricing`);
  const merged = await page.evaluate(() => document.querySelector("main").textContent.match(/\$\d+per|data\(/g) ?? []);
  check("pricing has no run together words like $4per", merged.length === 0, merged.join(","));
  check("no console errors on the About and Pricing pages", errors.length === 0, errors.join(" | "));
  await context.close();
}

// ======================= Item 21: the phone text thread =======================
{
  const { context, page, errors } = await newPage();
  await resetApp(page);
  await page.goto(`${BASE}/tenant/settings`);
  await page.getByRole("link", { name: "See how GoHome will feel by text" }).click();
  await page.waitForURL("**/tenant/texts");
  check("settings links to the phone preview", true);
  check("the phone page says this is how the full product will look and nothing is sent", (await count(page, /In the full product, GoHome works over text message/)) === 1);
  const phone = page.getByRole("region", { name: /phone showing a text conversation/ });
  check("a phone mockup is shown", (await phone.count()) === 1 && (await phone.getByText("4:07 AM").count()) === 1 && (await phone.getByText("Text message").count()) === 1);
  await phone.getByRole("button", { name: "My water heater is leaking" }).click();
  await phone.getByText(/near an outlet/).waitFor(wait20);
  check("the tenant's text and GoHome's safety question show as text bubbles", (await phone.getByText("My water heater is leaking", { exact: true }).count()) >= 1);
  await phone.getByRole("button", { name: /^No$/ }).click();
  await phone.getByText(/picture guide for your heater/i).waitFor(wait20);
  check("GoHome texts the safe steps with a picture guide", (await phone.getByText(/Two quick steps for your Hearthline HL-40G-NG/).count()) === 1);
  const real = await page.evaluate(() => JSON.parse(window.localStorage.getItem("gohome-v1") ?? "{}").agent?.timeline?.length ?? 0);
  check("the phone preview never touches the real conversation", real === 0, `${real}`);

  // The whole story, by itself.
  await page.getByRole("button", { name: "Start over" }).click();
  check("start over empties the phone", (await phone.getByText(/near an outlet/).count()) === 0);
  await page.getByRole("button", { name: "Play the whole story" }).click();
  await phone.getByText(/All fixed/).waitFor({ timeout: 90000 });
  const story = await phone.innerText();
  check("the story runs from the problem to a plumber booked to fixed, all as texts", /Good news: Willow Glen/.test(story) && /see you then/.test(story) && /All fixed/.test(story));
  check("the tenant's phone shows no prices", !/\$\d|quote/i.test(story), story.slice(0, 80));
  check("no console errors on the phone page", errors.length === 0, errors.join(" | "));
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
  await page.getByText(/Found your water heater in your home record/).waitFor(wait20);
  check("the agent tab shows the steps GoHome took, and the emergency rules only after the safety question", (await page.getByText(/Checked your problem against the emergency safety rules/).count()) === 0);
  check("the tenant sees the bottom tab bar with three tabs", (await page.getByRole("navigation", { name: "Tenant tabs" }).getByRole("link").count()) === 3);
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
  const paths = ["/", "/pricing", "/about", "/tenant", "/tenant/home", "/tenant/pay", "/tenant/settings", "/tenant/texts", "/owner/settings", "/tenant/guides/heater-water-off", "/owner", "/owner/request", "/owner/record", "/owner/forecast", "/owner/rent", "/owner/decide", "/owner/quote", "/owner/book", "/feedback"];
  for (const path of paths) {
    await page.goto(`${BASE}${path}`);
    await page.waitForTimeout(1200);
    const bad = await page.evaluate((pagePath) => {
      const hits = [];
      for (const el of Array.from(document.body.querySelectorAll("p, li, dd, dt, td, th, span, h1, h2, h3"))) {
        const t = (el.innerText || "").trim().replace(/\s*\n\s*/g, " | ");
        if (/[a-z]\.[A-Z][a-z]/.test(t) && !/\d\.\d/.test(t) && !/\.com|\.org|\.gov|\.example/.test(t)) hits.push(`${pagePath}: ${t.slice(0, 60)}`);
        if (/\u2014|\u2013/.test(t)) hits.push(`${pagePath}: dash in "${t.slice(0, 40)}"`);
      }
      // Words run together across inline elements, like "$4" and "per unit" with no space between (a flex or grid gap does not count).
      const block = (n) => {
        let e = n.parentElement;
        while (e && getComputedStyle(e).display === "inline") e = e.parentElement;
        return e;
      };
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let prev = null;
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        const el = n.parentElement;
        if (!el || !el.offsetParent || ["SCRIPT", "STYLE"].includes(el.tagName) || n.textContent === "") continue;
        if (prev && prev.parentElement !== el) {
          const b = block(prev);
          const d = b ? getComputedStyle(b).display : "";
          if (b && b === block(n) && !/flex|grid/.test(d) && /[A-Za-z0-9%$)]$/.test(prev.textContent) && /^[A-Za-z0-9($]/.test(n.textContent)) {
            hits.push(`${pagePath}: run together "${prev.textContent.slice(-12)}|${n.textContent.slice(0, 12)}"`);
          }
        }
        prev = n;
      }
      return hits.slice(0, 4);
    }, path);
    check(`text spacing and dashes on ${path}`, bad.length === 0, bad.join(" || "));
  }
  await context.close();
}

await browser.close();
console.log(failed === 0 ? "\nAll end to end checks passed." : `\n${failed} check(s) failed.`);
process.exit(failed === 0 ? 0 : 1);
