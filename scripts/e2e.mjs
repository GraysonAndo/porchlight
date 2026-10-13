// End to end checks for behavior (not layout): the happy path, persistence,
// Reset demo, ?reset=1, blocked localStorage, and the feedback notes page.
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

// ---------- happy path, persistence, reset ----------
{
  const { context, page, errors } = await newPage();
  await page.goto(`${BASE}/?reset=1`);
  await page.getByRole("heading", { name: "Your rental, looked after." }).waitFor();
  await page.waitForFunction(() => !window.location.search.includes("reset=1"));
  check("?reset=1 is removed from the URL", !page.url().includes("reset=1"), page.url());

  await page.getByRole("button", { name: /I am a tenant/ }).click();
  await page.waitForURL("**/tenant/request");
  await page.getByRole("button", { name: "Use sample photo" }).click();
  await page.getByRole("button", { name: "Submit" }).click();
  await page.waitForURL("**/triage");
  await page.getByText("URGENT").first().waitFor({ timeout: 8000 });
  check("triage shows plumbing and urgent", (await page.getByText("Plumbing").count()) > 0);

  await page.getByRole("link", { name: "Read the equipment label" }).click();
  await page.getByRole("button", { name: "Use sample label photo" }).click();
  await page.getByText("Please confirm").waitFor({ timeout: 8000 });
  check("serial is flagged as low confidence", (await page.locator("#label-serial").inputValue()) === "15C0412-X");
  await page.locator("#label-serial").fill("15C0412-Y");
  await page.getByText("Confirmed").waitFor();
  check("editing the serial confirms it", true);
  await page.getByRole("button", { name: "Save to house record" }).click();
  await page.waitForURL("**/record");
  await page.getByText("15C0412-Y").waitFor();
  check("record shows the corrected serial", true);

  await page.reload();
  await page.getByText("15C0412-Y").waitFor();
  check("house record survives a reload", true);

  await page.goto(`${BASE}/forecast`);
  await page.getByText("overdue or due now").first().waitFor();
  check("forecast marks the water heater overdue", true);

  await page.goto(`${BASE}/quote`);
  await page.getByText("Slightly high").first().waitFor({ timeout: 8000 });
  check("quote verdict is slightly high", true);

  await page.goto(`${BASE}/decide`);
  await page.getByText("Replace it").waitFor();
  check("decision is replace", (await page.getByText("110%").count()) > 0);

  await page.goto(`${BASE}/rent`);
  await page.getByText("$3,456.00").first().waitFor();
  check("rent shows max new rent $3,456.00", true);
  check("rent shows 8.0% cap", (await page.getByText("8.0%").count()) > 0);
  check("rent shows 30 day notice at 5%", (await page.getByText("30 days").count()) > 0);
  await page.locator("#proposed-rent").fill("3552");
  await page.getByText("90 days").first().waitFor();
  check("rent shows 90 day notice at 11%", true);
  check("legal callout is present", (await page.getByText(/San Jose rent ordinances/).count()) > 0);
  check("draft, not legal advice is next to the result", (await page.getByText("Draft, not legal advice").count()) >= 2);
  await page.getByRole("button", { name: "Copy notice" }).click();
  await page.getByText(/Copied to your clipboard/).waitFor();
  const clip = await page.evaluate(() => navigator.clipboard.readText());
  check("copied notice is stamped as a draft", clip.startsWith("DRAFT, NOT LEGAL ADVICE"));

  await page.goto(`${BASE}/approve`);
  await page.getByText("Willow Glen Water Heater Co.").first().click();
  await page.getByText("To the tenant: Sample Tenant").waitFor({ timeout: 8000 });
  check("not-to-exceed defaults to 10% above the quote", (await page.locator("#nte").inputValue()) === "2695");
  await page.getByRole("button", { name: "Approve and send" }).click();
  await page.getByText("Vendor notified").waitFor();
  await page.getByText("Tenant notified").waitFor();
  await page.getByText("Visit scheduled").waitFor();
  check("confirmation says nothing was sent", (await page.getByText("Nothing was actually sent").count()) > 0);

  // Reset demo from the footer
  await page.getByRole("button", { name: "Reset demo" }).click();
  await page.waitForURL(`${BASE}/`);
  await page.goto(`${BASE}/record`);
  await page.getByText("The label has not been read yet.").waitFor();
  check("Reset demo clears the house record", true);
  await page.goto(`${BASE}/approve`);
  await page.getByText("1. Pick a vendor").waitFor();
  check("Reset demo clears the approval", true);

  check("no console errors on the happy path", errors.length === 0, errors.join(" | "));
  await context.close();
}

// ---------- feedback ----------
{
  const { context, page, errors } = await newPage();
  await page.goto(`${BASE}/?reset=1`);
  await page.goto(`${BASE}/quote`);
  await page.getByRole("button", { name: "Leave feedback" }).click();
  await page.getByRole("button", { name: "Save feedback" }).click();
  check("rating is required", (await page.getByText("Please pick a rating").count()) > 0);
  await page.getByText("5", { exact: true }).first().click();
  await page.getByLabel(/What was confusing/).fill("Clear. I would ask for the labor hours.");
  await page.getByRole("button", { name: "Save feedback" }).click();
  await page.getByText(/Saved. Thank you/).waitFor();
  await page.getByRole("button", { name: "Done" }).click();

  await page.goto(`${BASE}/feedback`);
  await page.getByText("Screen 5 of 9: Quote check").first().waitFor();
  check("feedback note lists the screen", true);
  await page.getByRole("button", { name: "Copy all as text" }).click();
  await page.getByText(/Copied to your clipboard/).waitFor();
  const text = await page.evaluate(() => navigator.clipboard.readText());
  check("copied text is readable", text.includes("Clarity rating: 5 of 5") && text.includes("labor hours"), text);
  await page.getByRole("button", { name: "Clear all" }).click();
  await page.getByRole("button", { name: /Yes, delete all 1 notes/ }).click();
  await page.getByText("No notes yet.").waitFor();
  check("Clear all removes the notes", true);

  // ?reset=1 clears saved notes too.
  await page.getByRole("button", { name: "Leave feedback" }).click();
  await page.getByText("3", { exact: true }).first().click();
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

// ---------- localStorage blocked ----------
{
  const { context, page, errors } = await newPage();
  await page.addInitScript(() => {
    const boom = () => {
      throw new DOMException("blocked", "SecurityError");
    };
    Object.defineProperty(window, "localStorage", {
      get() {
        boom();
      },
    });
  });
  await page.goto(`${BASE}/tenant/request`);
  await page.getByRole("button", { name: "Submit" }).click();
  await page.waitForURL("**/triage");
  await page.getByText("Owner notified").waitFor({ timeout: 8000 });
  check("app works with localStorage blocked", true);
  await page.getByRole("button", { name: "Leave feedback" }).click();
  await page.getByText("4", { exact: true }).first().click();
  await page.getByRole("button", { name: "Save feedback" }).click();
  await page.getByText(/Saved. Thank you/).waitFor();
  check("feedback still saves in memory with storage blocked", true);
  check("no uncaught errors with storage blocked", errors.length === 0, errors.join(" | "));
  await context.close();
}


// ---------- QA fixes: triage safety, approve limit, status, order, spacing ----------
{
  const { context, page, errors } = await newPage({ viewport: { width: 1280, height: 800 } });
  async function submit(text) {
    await page.goto(`${BASE}/?reset=1`);
    await page.goto(`${BASE}/tenant/request`);
    await page.locator("#description").fill(text);
    await page.getByRole("button", { name: "Submit" }).click();
    await page.waitForURL("**/triage");
    await page.getByText("Owner notified").waitFor({ timeout: 8000 });
  }

  await submit("I smell gas near the water heater");
  check("gas smell is an EMERGENCY", (await page.getByText("EMERGENCY").count()) > 0);
  check("gas smell tells the tenant to leave the home", (await page.getByText(/Leave the home now/).count()) > 0);
  check("gas smell tells the tenant to call 911 or the gas company", (await page.getByText(/911 or your gas company/).count()) > 0);

  await submit("The toilet is clogged");
  check("a clogged toilet is not the water heater result", (await page.getByText(/tank/i).count()) === 0);
  check("a clogged toilet is routine plumbing", (await page.getByText("ROUTINE").count()) > 0);

  // Approve: the default limit is valid and an invalid one blocks sending.
  await page.goto(`${BASE}/?reset=1`);
  await page.goto(`${BASE}/approve`);
  await page.getByText("Willow Glen Water Heater Co.").first().click();
  await page.getByRole("button", { name: "Approve and send" }).waitFor();
  check("default not-to-exceed is valid", await page.locator("#nte").evaluate((el) => el.checkValidity()));
  await page.getByText("To the tenant: Sample Tenant").waitFor({ timeout: 8000 });
  await page.locator("#nte").fill("1000");
  check("a limit below the quote shows an error", (await page.getByText(/cannot be lower than the quote/).count()) > 0);
  check("a limit below the quote disables Approve and send", await page.getByRole("button", { name: "Approve and send" }).isDisabled());
  await page.locator("#nte").fill("2700");
  await page.getByText("To the tenant: Sample Tenant").waitFor({ timeout: 8000 });
  check("a whole-dollar limit is valid", await page.locator("#nte").evaluate((el) => el.checkValidity()));
  await page.getByRole("button", { name: "Approve and send" }).click();
  await page.getByText("Nothing was actually sent").waitFor();

  // Owner home shows the booking, and the owner role survives a reload.
  await page.goto(`${BASE}/`);
  await page.getByRole("button", { name: /I am an owner/ }).click();
  await page.getByText("BOOKED").waitFor();
  check("owner home shows BOOKED after approving", true);
  check("owner home no longer says Waiting for triage", (await page.getByText("Waiting for triage").count()) === 0);
  await page.reload();
  await page.getByText("Open repair request").waitFor();
  check("owner role survives a reload", true);

  // Tenant role is remembered on the home screen.
  await page.getByRole("button", { name: /Switch to tenant view/ }).click();
  await page.goto(`${BASE}/`);
  await page.getByText(/last using Porchlight as a tenant/).waitFor();
  check("tenant role is remembered on the home screen", true);

  // Forecast is sorted by years left.
  await page.goto(`${BASE}/forecast`);
  const order = await page.locator("tbody th[scope=row]").allInnerTexts();
  check("forecast is sorted soonest first", order.join(",") === "Water heater,Air conditioner,Dishwasher,Furnace,Refrigerator,Roof", order.join(","));

  // Text spacing: look at visible text only (not script payloads).
  for (const path of ["/record", "/forecast", "/rent", "/decide", "/quote"]) {
    await page.goto(`${BASE}${path}`);
    await page.waitForTimeout(1500);
    const bad = await page.evaluate((pagePath) => {
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
        acceptNode(n) {
          const tag = n.parentElement && n.parentElement.tagName;
          return tag === "SCRIPT" || tag === "STYLE" || tag === "NOSCRIPT" ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
        },
      });
      // Join the text of each block element the way a screen reader would, then look for words glued to numbers.
      const hits = [];
      for (const el of Array.from(document.body.querySelectorAll("p, li, dd, dt, td, th, span, h1, h2, h3"))) {
        const t = (el.textContent || "").trim();
        const m = t.match(/[A-Za-z]:\d|[a-z]\d{4}[a-z]|of\d\.\d|\$[\d,.]+per|\d[A-Za-z]{3,}(?=\s|$)/);
        if (m && !/^\d+(st|nd|rd|th)$/.test(m[0])) hits.push(`${pagePath}: "${t.slice(0, 50)}"`);
      }
      void walker;
      return hits.slice(0, 3);
    }, path);
    check(`no words glued to numbers on ${path}`, bad.length === 0, bad.join(" | "));
  }

  check("no console errors in QA checks", errors.length === 0, errors.join(" | "));
  await context.close();
}

await browser.close();
console.log(failed === 0 ? "\nAll end to end checks passed." : `\n${failed} check(s) failed.`);
process.exit(failed === 0 ? 0 : 1);
