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

Use the **Demo guide** at the top of any screen to jump to a step. Every screen has a progress stepper, Back and Next, and a collapsible "Why this screen exists" line for interviews.

| Step | Screen | What it shows |
| --- | --- | --- |
| Home | `/` | Pick "I am a tenant" or "I am an owner". Owners see the property card, open request, equipment count, and shortcuts. |
| 1 | `/tenant/request` | Tenant reports a leaking water heater, with a sample photo button. |
| 2 | `/triage` | AI triage: urgency, summary, likely cause, safety checklist, tenant questions, "Owner notified". |
| 3 | `/label` | Equipment label photo is scanned. Fields are editable. The serial is low confidence so the human can confirm or fix it. |
| 4 | `/record` | House record with the water heater, a lifespan bar, and the other equipment. |
| 5 | `/quote` | Vendor quote compared to a typical price range, with flagged lines, questions, and possible savings. |
| 6 | `/decide` | Repair vs replace with the rules and real numbers shown ("How we decided"). |
| 7 | `/forecast` | 5-year replacement forecast, CSS bar chart, and a "set aside per year" figure. |
| 8 | `/rent` | California AB 1482 rent increase screen with a copyable notice draft. |
| 9 | `/approve` | Pick one of 3 vendors, set a not-to-exceed amount and access window, preview both messages, approve. |
| Extra | `/feedback` | Saved interview notes, "Copy all as text", "Clear all". |

Every page also has a floating **Leave feedback** button (1 to 5 clarity rating plus a note), a **Reset demo** button in the footer, and supports `?reset=1` on any URL.

## What is REAL vs FAKED

| Real (plain code, unit tested) | Faked |
| --- | --- |
| Repair vs replace rule (`lib/decision.ts`) | All AI outputs: triage, label reading, quote commentary, message drafts (`lib/mockAI.ts`) |
| Forecast math (`lib/forecast.ts`) | Photo reading. Any photo gives the same sample result. |
| AB 1482 math, notice period, notice text (`lib/rent.ts`) | Vendor data, vendor names, licenses, and quotes |
| Quote comparison and verdict thresholds (`lib/quote.ts`) | Every price, market range, typical lifespan, and the CPI figure |
| Saving to localStorage, Reset demo, feedback notes | Sending messages. "Approve and send" sends nothing. |
| | "Owner notified" and the confirmation timeline times |

## Assumptions

I made these calls without asking. Please check the ones that matter to you.

**Process**
- **Branch name.** Work was done on the branch the build environment assigned (`claude/porchlight-tmp-122-prototype-0ig6fp`) instead of a branch named `prototype-v1`. The PR goes from that branch into `main`. Nothing was pushed to `main`.
- **Next.js version.** The latest stable (16.4) was used. The generated config turned on two experimental options (`cacheComponents`, `partialPrefetching`). I removed them to keep classic App Router behavior. I also set `agentRules: false` so `next dev` does not write an `AGENTS.md` file into the repo.
- **Dev dependency.** `@types/node` is pinned to 22 to match the Node version and satisfy Vitest.
- **Security scan.** An automated DAST scan hook was suggested, but it needs an API key that is not set in this environment, so no scan was run. The app has no backend, so there is little to scan.

**Product**
- The tenant's description box is **pre-filled** with the seed text so interview demos do not need typing. It is editable.
- A photo is optional on the request form.
- Screens opened directly (for example by the Demo guide) fall back to the seed scenario, so any screen works on its own.
- On the triage screen, "Skip" goes to the house record (step 4).
- The triage and label results are the same for any text or photo. Urgency is always "urgent".
- Water heater age is `2026 minus the manufacture year` (March 2015 gives 11 years). If the owner edits the date, the forecast, record, and decision all update.
- The repair estimate on screen 6 is $450, and the "replace" cost is the Bayside quote ($2,850). A leaking tank cannot really be repaired, so the repair number is for comparison only.
- Per-line market ranges for the quote (unit, permit, and so on) were invented so each line can be compared. Only labor is flagged "high" for the seed quote. The expansion tank is flagged "ask" by the mock AI, not by the math.
- Possible savings are shown only when the quote is above the top of the range. Low is the amount over the top, high is double that. For the seed quote that is $250 to $500.
- The not-to-exceed amount starts at the quote plus 10%, rounded to the dollar, and resets when the vendor changes.
- Photos are not uploaded anywhere. Large photos are shown but not kept after a reload (localStorage is small).
- The sample contact uses a reserved fictional phone range (555 01xx) and `example.com`.

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
| Market range for a 40 gallon gas water heater swap: $1,600 to $2,600 | Quote check (5), Repair or replace (6), vendor badges on Approve (9) |
| Labor range $700 to $1,100 and other line ranges: unit $600 to $1,000, permit $100 to $250, haul away $50 to $150, expansion tank $150 to $300, fittings $100 to $250, seismic kit $25 to $75 | Quote check (5) |
| Vendor quotes: Bayside $2,850 (7 lines), Willow Glen $2,450, A1 Rapid $2,100 | Quote check (5), Repair or replace (6), Approve (9) |
| Possible savings $250 to $500 | Quote check (5) |
| Repair estimate $450 | Repair or replace (6) |
| Typical life and replace cost: water heater 10 yrs, $1,600 to $2,600; furnace 18 yrs, $4,500 to $7,000; air conditioner 15 yrs, $5,500 to $8,500; dishwasher 10 yrs, $700 to $1,200; refrigerator 14 yrs, $1,100 to $1,900; roof 25 yrs, $9,000 to $15,000 | House record (4), Repair or replace (6, water heater), Forecast (7) |
| Forecast totals and "set aside per year" (computed from the row above) | Forecast (7) |
| Local CPI change 3.0% | Rent increase (8) |
| AI confidence 82% (triage) and 86% (label) | Triage (2), Label (3) |
| Sample times in the confirmation timeline | Approve (9) |

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
- All AI output is identical regardless of what is typed or photographed.
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
