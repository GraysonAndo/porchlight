# Porchlight

## What Porchlight is

Porchlight is an AI property manager for owners with 1 to 10 rental units, the small landlords who do not want to pay a full property management company. Owners and tenants report repairs with photos, read equipment labels into a house record, check vendor quotes, plan for big replacements, and handle California rent increase notices. This repo is a clickable, low-fidelity prototype built for TMP 122 customer feedback interviews. Everything is fictional and nothing real happens behind the screens.

## How to run

```bash
npm install
npm run dev
```

Open http://localhost:3000. No environment variables, accounts, or database are needed.

Other commands:

| Command | What it does |
| --- | --- |
| `npm run lint` | ESLint |
| `npm test` | Vitest unit tests for the decision, forecast, rent, quote, and mock AI logic |
| `npm run build` | Production build |
| `node scripts/walkthrough.mjs` | Walks all 9 screens at 390x844 and 1280x800, saves screenshots, checks layout (needs the app running) |
| `node scripts/e2e.mjs` | Behavior checks: happy path, reload, Reset demo, `?reset=1`, blocked localStorage, feedback notes (needs the app running) |

The two scripts use Playwright with the preinstalled Chromium (never run `playwright install`). Set `BASE_URL` if the app is not on port 3000.

Screenshots from the last run are in [`docs/screenshots`](docs/screenshots), two per screen (`-mobile` and `-desktop`).

## How to deploy on Vercel

1. Push this repo to GitHub.
2. In Vercel, choose "Add New Project" and import the repo.
3. Leave every setting on its default. Do not add environment variables.
4. Deploy.

The app is fully static and makes no network requests at runtime. The font (Nunito Sans) is downloaded once at build time by `next/font` and then served from your own domain.

## The demo flow

There are two sides to the story, and each side only sees what it needs. **Porchlight** is the AI property manager in the middle.

- The **tenant** lives in the home. They report a problem, stay safe, and follow progress. They do **not** choose or pay for the repair.
- The **owner** owns the home. They review the request, check the house record, compare a quote, and approve the spending.

The **Demo guide** at the top of any screen jumps to any screen, grouped by side. Every screen has a collapsible "Why this screen exists" line for interviews. The header always says "Tenant view" or "Owner view", with a "Switch role" link.

**Tenant side (3 screens)**

| Step | Screen | What it shows |
| --- | --- | --- |
| 1 | `/tenant/request` | Report a leaking water heater, with a sample photo button. Says plainly that the owner makes the repair decision. |
| 2 | `/tenant/safety` | Urgency in plain words, who handles the repair, safety steps with a "How to do this" guide under every step, follow-up questions the tenant answers, "Owner notified". |
| 3 | `/tenant/status` | A status timeline (reported, owner notified, owner choosing a plumber, plumber booked, confirm the time, fixed), the owner's message, and "That time works" or "I need a different time". |

**Owner side (5 screens), then planning tools**

| Step | Screen | What it shows |
| --- | --- | --- |
| 0 | `/owner` | Owner home: the property, the tenant's new request and its status, and shortcuts. |
| 1 | `/owner/request` | The tenant's report and photo, urgency, what Porchlight found, the equipment involved (already in the record), what the tenant was told, and the tenant's answers. |
| 2 | `/owner/record` | The house record. The heater is **already on file** with brand, model, serial number, and where the details came from. Nothing to type or photograph. |
| 3 | `/owner/quote` | Vendor quote compared to a typical price range, with flagged lines, questions, and possible savings. |
| 4 | `/owner/decide` | Repair vs replace with the rules and real numbers shown ("How we decided"). |
| 5 | `/owner/book` | Pick one of 3 vendors, set a not-to-exceed amount and access window, preview both messages, approve. Then a demo button, "the plumber finishes the job", adds the new heater to the house record automatically. |
| Tool | `/owner/forecast` | 5-year replacement forecast, CSS bar chart, and a "set aside per year" figure. |
| Tool | `/owner/rent` | California AB 1482 rent increase screen with a copyable notice draft. |
| Optional | `/owner/label` | Add or check older equipment from a label photo. It compares what it reads with the record. Most owners will never need it. |
| Extra | `/feedback` | Saved interview notes, "Copy all as text", "Clear all". |

Old links from earlier versions (`/triage`, `/label`, `/record`, `/quote`, `/decide`, `/approve`, `/forecast`, `/rent`) redirect to the new pages.

Every page also has a floating **Leave feedback** button (1 to 5 clarity rating plus a note), a **Reset demo** button in the footer, and supports `?reset=1` on any URL.

## What is REAL vs FAKED

| Real (plain code, unit tested) | Faked |
| --- | --- |
| Repair vs replace rule (`lib/decision.ts`) | All AI outputs: triage (keyword rules plus the seeded scenario), label reading, quote commentary, message drafts (`lib/mockAI.ts`) |
| Forecast math (`lib/forecast.ts`) | Photo reading. Any photo gives the same sample result. |
| AB 1482 math, notice period, notice text (`lib/rent.ts`) | Vendor data, vendor names, licenses, and quotes |
| Quote comparison and verdict thresholds (`lib/quote.ts`) | Every price, market range, typical lifespan, and the CPI figure |
| Saving to localStorage, Reset demo, feedback notes | Sending messages. "Approve and send" sends nothing. |
| | "Owner notified", the confirmation timeline times, and the installer's automatic record (the integration is simulated) |

## Assumptions

I made these calls without asking. Please check the ones that matter to you.

**Process**
- **Branch name.** Work was done on the branch the build environment assigned (`claude/porchlight-tmp-122-prototype-0ig6fp`) instead of a branch named `prototype-v1`. The PR goes from that branch into `main`. Nothing was pushed to `main`.
- **Next.js version.** The latest stable (16.4) was used. The generated config turned on two experimental options (`cacheComponents`, `partialPrefetching`). I removed them to keep classic App Router behavior. I also set `agentRules: false` so `next dev` does not write an `AGENTS.md` file into the repo.
- **Dev dependency.** `@types/node` is pinned to 22 to match the Node version and satisfy Vitest.
- **Icons and fonts.** Icons are [Phosphor Icons](https://github.com/phosphor-icons/react) (MIT license), in the duotone style. Headlines use Fraunces and body text uses Nunito Sans, both from Google Fonts through `next/font` (open font license).
- **Security scan.** An automated DAST scan hook was suggested, but it needs an API key that is not set in this environment, so no scan was run. The app has no backend, so there is little to scan.

**Product**
- The tenant's description box is **pre-filled** with the seed text so interview demos do not need typing. It is editable.
- A photo is optional on the request form.
- Screens opened directly (for example by the Demo guide) fall back to the seed scenario, so any screen works on its own. The owner side always has a sample request from the sample tenant waiting.
- **Roles.** The tenant side has only what a tenant needs: report, safety steps, status. Quote check, repair or replace, the forecast, and rent are owner decisions and are not shown to tenants. Forecast and rent are planning tools, not part of one repair, so they sit outside the numbered owner flow.
- **The house record already knows the equipment.** The seeded water heater (brand, model, serial, size, fuel, date) is "on file from the installer's warranty registration", so nobody photographs or types it. When a plumber finishes a job, the new equipment is added automatically (the "Demo: the plumber finishes the job" button simulates this). The label photo tool is kept only as an optional way to add or check older equipment, and it compares what it reads with the record.
- The tenant's answers to the follow-up questions are saved and shown to the owner. The tenant's "That time works" is shown on the owner home.
- The demo "plumber finishes the job" button is not a real feature. It exists to show the record updating by itself.
- The label reading is the same for any photo. Triage uses plain keyword rules (`lib/triage.ts`): gas, carbon monoxide, smoke or sparks, and flooding always give an EMERGENCY result with safety steps (for a gas smell: leave the home, no sparks, call 911 or the gas company). A water heater problem gives the seeded scenario. Other problems get a short generic result for their category (plumbing, HVAC, electrical, appliance, and so on). It is a keyword match, not real understanding.
- Water heater age is `2026 minus the manufacture year` (March 2015 gives 11 years). If the owner corrects the date in the label tool, the forecast, record, and decision all update. After the replacement, the forecast uses the new heater (installed 2026, due 2036).
- The repair estimate on screen 6 is $450, and the "replace" cost is the Bayside quote ($2,850). A leaking tank cannot really be repaired, so the repair number is for comparison only.
- Per-line market ranges for the quote (unit, permit, and so on) were invented so each line can be compared. Only labor is flagged "high" for the seed quote. The expansion tank is flagged "ask" by the mock AI, not by the math.
- Possible savings are shown only when the quote is above the top of the range. Low is the amount over the top, high is double that. For the seed quote that is $250 to $500.
- The not-to-exceed amount starts at the quote plus 10%, rounded to the dollar, and resets when the vendor changes.
- Photos are not uploaded anywhere. Large photos are shown but not kept after a reload (localStorage is small).
- The sample contact uses a reserved fictional phone range (555 01xx) and `example.com`.

**Safety guides**
- Each safety step on the tenant's safety screen has a "How to do this" guide (`lib/safetyGuides.ts`): time needed, what you need, why, numbered steps, a "Stop and get help if" list, and a valve diagram where it helps.
- The guides are **written by hand, not generated by the AI**, because safety advice should be reviewed. The AI only chooses which safety steps apply.
- Guides use the house record. The seeded heater is a natural gas heater, so the guide shows the gas steps. If the record says electric (for example after checking a label), the "gas valve" step becomes "turn off the power at the breaker".
- Guides do not name real utilities. They tell the tenant to use the emergency number on their gas bill or meter, and to call 911.
- **Before real use**, have a licensed plumber, electrician, and your gas utility review every guide. They are general information, not professional advice.

**Forecast**
- The window is five calendar years: 2026 to 2030. "Within 5 years" means due by 2030.
- Items already past due are counted in 2026, because that is when the money is needed.
- "Set aside per year" is the 5 year total divided by 5, rounded to the dollar. The roof (due 2034) is left out.
- `CURRENT_YEAR` is a constant (2026) in `lib/forecast.ts`.

**AB 1482 screen** (Draft, not legal advice)
- Cap percent is `min(5 + CPI, 10)`. Maximum new rent is current rent times `(1 + cap)`, rounded **down** to the cent. Money math is done in whole cents.
- Notice period is 30 days if the increase is 10% or less, otherwise 90 days. Exactly 10% counts as 30 days.
- "May be exempt" is shown when **either** (single family home or condo, AND not owned by a REIT, corporation, or LLC with a corporate member, AND the written exemption notice was given) **or** the building is less than 15 years old. The cap calculation is still available underneath.
- The "12+ months" answer is recorded. It only changes a note on screen. The note says the state cap generally applies no matter how long the tenant has lived there. **Please verify this with an attorney.**
- The cap is really measured over any 12 months. This prototype tests only the single proposed increase against the current rent. If one earlier increase was given, a note says earlier increases count toward the cap.
- Two or more increases in the last 12 months shows a red warning.
- The notice date defaults to today and is editable. The effective date is the notice date plus the notice period.

## Placeholder numbers list

Everything below is "Illustrative placeholder, not market data" and is labeled that way where it appears on screen.

| Number | Where it appears |
| --- | --- |
| Market range for a 40 gallon gas water heater swap: $1,600 to $2,600 | Owner quote check, repair or replace, vendor badges on approve and book |
| Labor range $700 to $1,100 and other line ranges: unit $600 to $1,000, permit $100 to $250, haul away $50 to $150, expansion tank $150 to $300, fittings $100 to $250, seismic kit $25 to $75 | Owner quote check |
| Vendor quotes: Bayside $2,850 (7 lines), Willow Glen $2,450, A1 Rapid $2,100 | Owner quote check, repair or replace, approve and book |
| Possible savings $250 to $500 | Owner quote check |
| Repair estimate $450 | Owner repair or replace |
| Typical life and replace cost: water heater 10 yrs, $1,600 to $2,600; furnace 18 yrs, $4,500 to $7,000; air conditioner 15 yrs, $5,500 to $8,500; dishwasher 10 yrs, $700 to $1,200; refrigerator 14 yrs, $1,100 to $1,900; roof 25 yrs, $9,000 to $15,000 | Owner house record, repair or replace (water heater), forecast |
| Forecast totals and "set aside per year" (computed from the row above) | Owner forecast |
| Local CPI change 3.0% | Owner rent increase |
| AI confidence 82% (triage) and 86% (label) | Owner request (1), Label tool |
| Sample times in the confirmation timeline | Approve and book, tenant status |

Not placeholders but fictional sample data: rent $3,200 per month, proposed rent default $3,360, tenant since 2023, the address, and all names.

## How to swap mockAI for the real Claude API with vision later

The UI only talks to the `AIProvider` interface in `lib/types.ts`, through one import in `lib/ai.ts`. Nothing in `app/` or `components/` knows the AI is fake.

1. **Add a server route.** Create `app/api/ai/[method]/route.ts` (or one route per method). It receives the typed input as JSON, calls the Anthropic Messages API with the official SDK, and returns the typed output. The route is the only place the key is used.
2. **Put the key on the server only.** Set `ANTHROPIC_API_KEY` in Vercel under Project Settings, Environment Variables, and in a git-ignored `.env.local` for local work. Never prefix it with `NEXT_PUBLIC_` and never commit it.
3. **Use vision for photos.** For `triageRequest` and `readLabel`, send each photo as an image content block (base64) next to the text. Photos are already data URLs in the app. Note that Claude vision does not accept SVG, so the two sample SVGs would need PNG versions.
4. **Ask for structured output.** Define a tool (or JSON schema) matching `TriageResult`, `LabelResult`, and `QuoteCheckResult`, and validate the reply before returning it. Keep `fieldsNeedingReview` and `confidence` so the "Please confirm" interaction still works.
5. **Keep the math in code.** `checkQuote` should still call `lib/quote.ts` for the verdict, and only ask the model for wording, flags, and questions. Repair vs replace, forecast, and AB 1482 never go through the model.
6. **Write `lib/claudeAI.ts`** that implements `AIProvider` by calling your route with `fetch`, then change `lib/ai.ts` to export it instead of `mockAI`.
7. **Add what a real version needs:** rate limiting, an image size cap, logging, and a way to store photos safely.

## Known limitations

- It is a prototype: no accounts, no database, no real sending, one seeded scenario, one property.
- Mock triage is keyword based and will misread unusual wording. The label reading and quote commentary are fixed samples.
- Dates and "today" depend on the browser. The forecast is pinned to 2026.
- The rent screen does not track the full 12 month rent history, only the number of increases.
- Data is stored per browser in localStorage. Feedback notes do not sync between devices, so export them after each interview with "Copy all as text".
- Large photos are not kept after a reload.
- Only English, US dollars, and one California property.
- Tested in Chromium. Not tested on Safari or Firefox.
- No automated screen reader testing. Basic accessibility is in place (labels, focus rings, text on every badge, 44px tap targets), but it has not been audited.

## Next steps

- Run the customer interviews and read the notes on `/feedback`.
- Replace `mockAI` with a real provider (see above) and test it on real equipment labels.
- Replace placeholder prices with real local data, and ask owners which numbers they trust.
- Have an attorney review the AB 1482 logic, the notice wording, and the local rules (for example San Jose) before anyone relies on it.
- Add multi-property support and real accounts only if interviews show owners want them.
