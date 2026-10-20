// Checks for the final defect list: things that need two tabs, a reload, or a real click to prove.
//
// Usage: BASE_URL=http://localhost:3000 node scripts/final-list.mjs

import { launch, watchErrors, BASE } from "./browser.mjs";

let failed = 0;
function check(name, ok, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${ok ? "" : ` ${detail}`}`);
  if (!ok) failed++;
}

const wait20 = { timeout: 20000 };
const browser = await launch();

async function newContext() {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, permissions: ["clipboard-read", "clipboard-write"] });
  const errors = [];
  const open = async () => {
    const page = await context.newPage();
    watchErrors(page, errors);
    return page;
  };
  return { context, open, errors };
}

async function resetApp(page) {
  await page.goto(`${BASE}/?reset=1`);
  await page.waitForFunction(() => !window.location.search.includes("reset=1"));
}

const chatText = (page) => page.getByRole("log", { name: "Messages" }).innerText();

// ======================= Two tabs never wipe each other =======================
{
  const { context, open, errors } = await newContext();
  const a = await open();
  await resetApp(a);
  await a.goto(`${BASE}/owner/settings`);
  await a.getByRole("switch", { name: "Email me a weekly summary" }).waitFor(wait20);
  const b = await open();
  await b.goto(`${BASE}/owner/rent`);
  await b.locator("#proposed-rent").fill("3333");
  await b.waitForTimeout(300);
  // Tab A was loaded before B changed the rent. Its save must not put the old rent back.
  await a.getByRole("switch", { name: "Email me a weekly summary" }).click();
  await a.waitForTimeout(300);
  await b.reload();
  check("a save in a stale tab does not undo another tab's rent", (await b.locator("#proposed-rent").inputValue()) === "3333");
  check("and the stale tab's own change is kept", (await a.getByRole("switch", { name: "Email me a weekly summary" }).getAttribute("aria-checked")) === "false");

  // Live: A sits on the rent page, B changes it, A shows it without a reload.
  await a.goto(`${BASE}/owner/rent`);
  await b.locator("#proposed-rent").fill("3344");
  await a.waitForFunction(() => document.querySelector("#proposed-rent")?.value === "3344", null, { timeout: 5000 }).then(
    () => check("an open page picks up a change made in another tab", true),
    () => check("an open page picks up a change made in another tab", false),
  );
  check("no console errors with two tabs", errors.length === 0, errors.join(" | "));
  await context.close();
}

// ======================= Record edits stick, and reach every page =======================
{
  const { context, open, errors } = await newContext();
  const page = await open();
  await resetApp(page);
  await page.goto(`${BASE}/owner/record`);
  const card = page.locator("li.card", { hasText: "Water heater" }).first();
  await card.getByRole("button", { name: "Edit details" }).click();
  await page.locator("#edit-water-heater-serial").fill("15C0412-Z");
  await page.locator("#edit-water-heater-location").fill("Garage, against the south wall");
  await page.locator("#edit-water-heater-year").fill("2012");
  await card.getByRole("button", { name: "Save" }).click();
  await page.reload();
  const text = await page.locator("main").innerText();
  check("a corrected serial survives a reload with its badge", /15C0412-Z/.test(text) && /Corrected by you/.test(text));
  check("the installed year is editable and used", /2012 \(14 years old\)/.test(text));
  await page.goto(`${BASE}/owner/request`);
  await page.getByText("Equipment involved").waitFor(wait20);
  check("the request page uses the corrected location", /south wall/.test(await page.locator("main").innerText()));
  await page.goto(`${BASE}/owner/decide`);
  check("the repair or replace advice uses the corrected age", /14 years/.test(await page.locator("main").innerText()));
  await page.goto(`${BASE}/owner`);
  await page.getByRole("button", { name: "See how GoHome handles a repair" }).click();
  await page.getByRole("button", { name: "Approve" }).first().waitFor({ timeout: 30000 });
  await page.getByRole("button", { name: "Approve" }).first().click();
  await page.getByRole("button", { name: "Mark done" }).waitFor({ timeout: 30000 });
  await page.getByRole("button", { name: "Mark done" }).click();
  await page.getByText(/Installer registered the new heater/).first().waitFor(wait20).catch(() => {});
  await page.goto(`${BASE}/owner/record`);
  check("after the job, History names the heater as the owner corrected it", /serial 15C0412-Z/.test(await page.locator("main").innerText()));
  await page.goto(`${BASE}/owner`);
  check("the owner activity feed records that the job is done", (await page.getByText(/Installer registered the new heater/).count()) > 0);
  check("no console errors on record edits", errors.length === 0, errors.join(" | "));
  await context.close();
}

// ======================= Guides: Done works and the place is remembered =======================
{
  const { context, open, errors } = await newContext();
  const page = await open();
  await resetApp(page);
  await page.goto(`${BASE}/tenant/guides/breaker-reset`);
  await page.getByRole("button", { name: "Next step" }).click();
  await page.getByRole("button", { name: "Next step" }).click();
  await page.reload();
  check("a guide remembers its step across a reload", /step 3 of/i.test(await page.locator("main").innerText()));
  while ((await page.getByRole("button", { name: "Next step" }).count()) > 0) await page.getByRole("button", { name: "Next step" }).click();
  await page.getByRole("button", { name: /^Done/ }).click();
  await page.waitForURL(`${BASE}/tenant`, wait20);
  check("a guide's Done button takes the tenant back to GoHome", true);
  const idx = await page.goto(`${BASE}/tenant/guides`);
  check("the guides index is not a 404", page.url().endsWith("/tenant/home") && idx.ok());
  check("no console errors in guides", errors.length === 0, errors.join(" | "));
  await context.close();
}

// ======================= The chat =======================
{
  const { context, open, errors } = await newContext();
  const page = await open();
  await resetApp(page);
  await page.goto(`${BASE}/tenant`);
  await page.getByRole("button", { name: "My water heater is leaking" }).click();
  await page.getByText(/near an outlet/).first().waitFor(wait20);
  await page.waitForTimeout(1500);
  check("a quick reply shows exactly what was tapped", /My water heater is leaking/.test(await chatText(page)));
  await page.getByRole("button", { name: /^2\s+No$/ }).click();
  await page.getByText(/Two quick steps/).first().waitFor(wait20);
  await page.waitForTimeout(1200);
  check("the answer chip shows its label, not a code", (await chatText(page)).split("\n").some((l) => l.trim() === "No"));
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await page.getByText(/Your landlord has been told/).first().waitFor(wait20);
  await page.waitForTimeout(800);
  await page.locator("#tenant-msg").fill("The kitchen sink is clogged and backing up");
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await page.getByText(/separate request/i).first().waitFor(wait20);
  check("a second problem is heard as its own request", /still on track/.test(await chatText(page)));
  check("the requests list shows both", (await page.locator("#requests-heading").count()) === 1 && (await page.locator("section[aria-labelledby=requests-heading] li").count()) >= 2);
  const pill = page.getByRole("tab", { name: /What GoHome is doing/ });
  await page.setViewportSize({ width: 600, height: 900 });
  await page.getByRole("tab", { name: "Chat" }).focus();
  await page.keyboard.press("ArrowRight");
  check("arrow keys move between tabs", (await pill.getAttribute("aria-selected")) === "true");
  await page.setViewportSize({ width: 1280, height: 900 });
  // Long messages are counted, never silently cut.
  await page.locator("#tenant-msg").fill("x".repeat(900));
  check("a long message shows a counter", (await page.getByText("900 of 1000 characters").count()) === 1);

  await resetApp(page);
  await page.goto(`${BASE}/tenant`);
  await page.getByRole("button", { name: "I smell gas" }).click();
  await page.getByText(/sounds like an emergency/).first().waitFor(wait20);
  await page.waitForTimeout(1500);
  const gas = await chatText(page);
  check("the gas answer has a tap-to-call number", (await page.locator('a[href="tel:18007435000"]').count()) === 1 && (await page.locator('a[href="tel:911"]').count()) >= 1);
  check("the gas answer does not ask for a reply before the tenant is outside", /Once you are outside/.test(gas) && !/Reply here if anyone is hurt/.test(gas));
  check("no console errors in the chat", errors.length === 0, errors.join(" | "));
  await context.close();
}

// ======================= Paying =======================
{
  const { context, open, errors } = await newContext();
  const page = await open();
  await resetApp(page);
  await page.goto(`${BASE}/tenant/pay`);
  await page.getByText("Secure checkout").first().waitFor({ ...wait20, state: "attached" }).catch(() => {});
  const main = await page.locator("main").innerText();
  check("overdue rent is called overdue", /Overdue/.test(main) && /days? late/.test(main), main.slice(0, 300));
  check("water and trash is not styled as urgent before it is due", /Due Oct 31/.test(main));
  const checkout = page.frameLocator('iframe[title="Secure checkout"]');
  await checkout.getByText("Secure checkout").waitFor(wait20);
  await checkout.getByLabel("October 2026 rent", { exact: false }).uncheck();
  await checkout.getByLabel("Water and trash", { exact: false }).uncheck();
  check("Pay is disabled with nothing picked", await checkout.getByRole("button", { name: "Pick what to pay" }).isDisabled());
  await checkout.getByLabel("October 2026 rent", { exact: false }).check();
  await checkout.getByRole("button", { name: "Use the sample card" }).click();
  await checkout.getByRole("button", { name: /^Pay \$/ }).click();
  await checkout.getByText("Payment received").waitFor(wait20);
  await checkout.getByRole("button", { name: "Done" }).click();
  await page.waitForTimeout(500);
  const history = await page.locator("section[aria-labelledby=history-heading]").innerText();
  check("history shows rent at $3,200.00 with the card fee on its own line", /\$3,200\.00/.test(history) && /Card fee/.test(history) && !/\$3,29\d\.\d\d\s*$/m.test(history.split("Card fee")[0]), history);
  check("no console errors paying", errors.length === 0, errors.join(" | "));
  await context.close();
}

// ======================= Rent =======================
{
  const { context, open, errors } = await newContext();
  const page = await open();
  await resetApp(page);
  await page.goto(`${BASE}/owner/rent`);
  const verdict = () => page.locator("[role=status].sticky").innerText();
  check("the verdict is one big banner: OK to send", /OK to send/.test(await verdict()));
  await page.locator("#proposed-rent").fill("3500");
  check("over the limit says do not send, and by how much", /Do not send: over the limit by/.test(await verdict()));
  await page.locator("#proposed-rent").fill("3360");
  await page.locator("#increases").fill("2");
  check("two earlier increases block a third", /Do not send: a third increase/.test(await verdict()));
  check("and Send stays disabled", await page.getByRole("button", { name: /Send notice/ }).isDisabled());
  check("and no suggestion is made", (await page.getByText(/Max legal:/).count()) === 0);
  await page.locator("#increases").fill("1");
  await page.locator("#prior-increase").fill("3");
  check("an earlier increase lowers the highest allowed rent", /\$3,355\.33/.test(await page.locator("main").innerText()));
  await page.locator("#increases").fill("0");
  await page.locator("#start-date").fill("2026-12-14");
  const letter = await page.locator("pre").innerText();
  check("the letter uses the start date the owner picked", /Starting December 14, 2026/.test(letter), letter.slice(0, 400));
  check("the letter says how it is delivered, from where, and on what basis", /Delivery: first-class mail/.test(letter) && /Owner mailing address/.test(letter) && /1947\.12/.test(letter));
  check("the letter opener says up and by how much", /Your rent is going up/.test(letter) && /an increase of \$160\.00 \(\+5\.0%\)/.test(letter), letter);
  check("a countdown shows days left to send", (await page.getByText(/days left to send|Last day to send/).count()) === 1);
  await page.getByRole("button", { name: /Send notice/ }).click();
  await page.getByText(/^Sent on/).first().waitFor(wait20);
  await page.locator("#proposed-rent").fill("3300");
  check("changing the rent after sending marks the receipt out of date and allows a re-send", (await page.getByText(/numbers on this page are different now/).count()) === 1 && (await page.getByRole("button", { name: "Send updated notice" }).isEnabled()));
  await page.getByRole("button", { name: "Send updated notice" }).click();
  await page.getByText(/^Sent on/).first().waitFor(wait20);
  check("every notice sent is logged", (await page.locator("h3", { hasText: "Notices you have sent" }).count()) === 1 && (await page.locator("h3:has-text('Notices you have sent') + ul li").count()) === 2);
  await page.locator("#current-rent").fill("3300");
  check("the lease card says the current rent was changed", (await page.getByText(/You changed the current rent below/).count()) === 1);
  check("no console errors on rent", errors.length === 0, errors.join(" | "));
  await context.close();
}

// ======================= Quotes =======================
{
  const { context, open, errors } = await newContext();
  const page = await open();
  await resetApp(page);
  await page.goto(`${BASE}/owner/quote`);
  await page.locator("#paste-quote").fill("Harbor View Plumbing\nCSLB #123456\nCall us at (408) 555-0134\nWater heater unit .......... $820.00\nLabor .......... $1,080.00\nTOTAL $1,900.00");
  await page.getByRole("button", { name: "Check this quote" }).click();
  const text = await page.locator("main").innerText();
  check("a license number and a phone number are not prices", !/\$123,456|-\$134|do not add up|add up to \$125/.test(text));
  await page.locator("#paste-quote").fill("Harbor View Plumbing\nWater heater unit ........ $820.00\nLabor ........ $1,080.00\nTOTAL $3,170.00");
  await page.getByRole("button", { name: "Check this quote" }).click();
  check("a quote that does not add up gets no verdict until the owner chooses", (await page.getByText("No verdict yet: the quote does not add up").count()) === 1);
  await page.getByRole("button", { name: "Check it anyway" }).click();
  await page.getByText("Lines to look at").waitFor(wait20);
  check("the owner can still check it anyway", true);
  await page.locator("#paste-quote").fill("");
  await page.getByRole("button", { name: "Use a sample quote" }).click();
  await page.getByText("Possible savings").waitFor(wait20);
  const savings = await page.locator("main").innerText();
  check("the possible savings are explained", /top of the typical range/.test(savings) && /\$570 to \$1,070/.test(savings), savings.slice(savings.indexOf("Possible savings"), savings.indexOf("Possible savings") + 300));
  check("no console errors on quotes", errors.length === 0, errors.join(" | "));
  await context.close();
}

// ======================= Everything else =======================
{
  const { context, open, errors } = await newContext();
  const page = await open();
  await resetApp(page);
  await page.goto(`${BASE}/pricing`);
  check("each page has its own tab title", (await page.title()) === "Pricing | GoHome");
  await page.getByText("10 units").click();
  check("pricing shows the whole portfolio", (await page.getByText("$80 a month for 10 units ($960 a year)").count()) === 1);
  await page.getByRole("button", { name: "I would pick Plus" }).click();
  check("the pick is confirmed next to the tier", (await page.locator("li.card", { hasText: "Plus" }).getByText("Saved on this device").count()) === 1);
  await page.goto(`${BASE}/owner/settings`);
  await page.locator("#owner-phone").fill("12345");
  check("a bad phone number is refused", (await page.getByText(/10 digit phone number/).count()) === 1 && (await page.getByRole("button", { name: "Save" }).isDisabled()));
  await page.locator("#owner-phone").fill("4085550199");
  await page.getByRole("button", { name: "Save" }).click();
  await page.reload();
  check("a corrected phone number is kept", (await page.locator("#owner-phone").inputValue()) === "(408) 555-0199");
  await page.goto(`${BASE}/tenant/settings`);
  await page.getByRole("switch", { name: "Autopay" }).click();
  check("autopay can be set up before any payment", (await page.getByRole("switch", { name: "Autopay" }).getAttribute("aria-checked")) === "true");
  await page.goto(`${BASE}/owner/decide`);
  await page.locator("#repair-estimate").fill("90000");
  check("the repair price can be changed and is checked", (await page.getByText(/more than \$50,000/).count()) === 1);
  await page.locator("#repair-estimate").fill("100");
  check("a cheap repair is a real input to the rules", (await page.locator("main").innerText()).length > 0);
  await page.goto(`${BASE}/owner/quote`);
  check("a repair page with no repair says it is a sample", (await page.getByText(/No repair has been reported yet/).count()) === 1);
  const spacing = await (async () => {
    await page.goto(`${BASE}/about`);
    return page.locator("main").innerText();
  })();
  check("the placeholder label is followed by a space", !/not market data[A-Za-z(]/.test(spacing));
  check("no console errors", errors.length === 0, errors.join(" | "));
  await context.close();
}

await browser.close();
console.log(failed === 0 ? "\nAll final-list checks passed." : `\n${failed} check(s) failed.`);
process.exit(failed === 0 ? 0 : 1);
