# GoHome

## What GoHome is

**GoHome: your home, made easy.** GoHome is an AI property manager for owners with 1 to 10 rental units, the small landlords who do not want to pay a full property management company, and for the tenants who live in those homes.

It keeps a record of everything in the house, with the brand, model, serial number, and place of each item. That record is what makes it useful:

- **Tenants** tell GoHome what is wrong in a simple chat. Because GoHome already knows the exact heater, furnace, or dishwasher, it gives step-by-step help made for that model, with a picture on every step (and a short animated "video" of the steps), without sending the tenant anywhere else. Nobody is ever asked to photograph a label.
- **Owners** open an approval inbox where the work is already done: the plumber is picked, the price is checked, the spending limit is set. They tap **Approve**. They can change anything first if they want.
- **GoHome itself is the centre of both screens.** A "What GoHome is doing" panel sits beside the chat (and beside the owner's inbox), showing the agent's work step by step. It texts both people each update, and either person can turn text updates off.

Nothing on a side that is not relevant to that person: tenants never see quotes, prices, forecasts, rent increases, or owner decisions, and owners do not see tenant how-to guides.

This repo is a clickable, low-fidelity build of the idea for UCSB TMP 122 customer feedback interviews. Everything is fictional sample data and nothing real is sent, charged, or stored outside the browser.

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
| `npm test` | Vitest unit tests for the decision, forecast, rent, quote, quote paste parser, recommendation, scenario, agent log, agents, guides, and mock AI logic |
| `npm run build` | Production build |
| `node scripts/walkthrough.mjs` | Walks every screen at 390x844 and 1280x800, saves screenshots, checks layout (needs the app running) |
| `node scripts/a11y.mjs` | Accessibility and responsive check on 19 pages at 360, 390 and 1280 wide: names, tap targets, text size, contrast, headings, focus ring, horizontal scroll, plus the guide, approval card and emergency states (needs the app running). Not Lighthouse and not a real device |
| `node scripts/phone.mjs` | Phone-style checks in an emulated browser: a 320px phone, a landscape phone, text zoomed to 200%, and real touch taps through the first tenant steps (needs the app running). Emulation only, not iOS Safari or a real phone |
| `node scripts/e2e.mjs` | Behavior checks: the landing page, both sides and what each can see, the guides, reload, Reset, `?reset=1`, blocked localStorage, feedback notes, old links (needs the app running) |

The two scripts use Playwright with the preinstalled Chromium (never run `playwright install`). Set `BASE_URL` if the app is not on port 3000.

Screenshots from the last run are in [`docs/screenshots`](docs/screenshots), two per screen (`-mobile` and `-desktop`).

## How to deploy on Vercel

1. Push this repo to GitHub.
2. In Vercel, choose "Add New Project" and import the repo.
3. Leave every setting on its default. Do not add environment variables.
4. Deploy.

The app is fully static and makes no network requests at runtime. The font (Plus Jakarta Sans) is downloaded once at build time by `next/font` and then served from your own domain.

## The screens

**`/` The welcome page.** The name, "Your home, made easy.", and two choices: Tenant or Owner. Choosing one opens that side.

**Tenant side** (tabs: Help, My home)

| Screen | What it shows |
| --- | --- |
| `/tenant` | "Help". A chat with GoHome on the left and **What GoHome is doing** on the right (tabs on a phone). Four tap-to-start examples or type anything. GoHome knows the exact heater already, asks the safety question, gives two safe steps with a **Show me how** picture guide, and texts who is coming and when. Questions about the home or lease ("How old is the water heater?", "Can I have a dog?") are answered from the record and lease only, or "I don't know" with an "Ask owner" relay. The agent panel shows only steps a tenant cares about, in plain words, and never prices. |
| `/tenant/home` | "My home": every item in the house with brand, model, serial, and place, and a button for each how-to guide. Plus quick fixes for the whole home (overflowing toilet, tripped breaker), the lease basics, the rent payment, and the text-updates switch. |
| `/tenant/pay` | **Pay rent and utilities.** The amount due, each bill with how late or how soon it is (only a bill past its date is "Overdue"), your payment history (one receipt per checkout, with the card fee on its own line), and an embedded checkout (a separate page, `/checkout`, shown in an iframe like a payment provider's form). Pick what to pay, choose card (2.9% + $0.30) or bank account (no fee), and the form checks the card number, expiry, CVC, ZIP, and routing number in plain words. You get a receipt with a confirmation number. Only the last four digits are kept, never the full number. Both people are texted, and the owner sees how it was paid. Gas and electric are noted as paid to the utility directly. |
| `/tenant/settings` | Settings: account (with an editable phone number), notifications (text updates, email receipts), autopay (can be turned on before the first payment), and your data. |
| `/tenant/guides/[id]` | A step-by-step picture guide: a drawing for each step that points at the part you need, a progress bar, "Play as a short video", and "Stop and get help if". Six guides for the water heater (two), furnace, dishwasher, toilet, and breaker. |

**Owner side** (tabs: Inbox, Home record, Forecast, Rent)

| Screen | What it shows |
| --- | --- |
| `/owner` | The **approval inbox**. A "Today" banner says "All quiet", "1 thing needs your OK", or "All done". Each approval is a card with the answer first (pick, price, spending limit, saving, visit time), one big **Approve**, plus "Other quotes", "Call me", and "See the details, or change something". After booking, one **Mark done**. Beside it: **What GoHome is doing** (every check, with who did it) and **Texts from GoHome**, where the owner can also ask it to check lease dates or a contractor's quote. Also the rent status and the text-updates switch. |
| `/owner/request`, `/owner/quote`, `/owner/decide`, `/owner/book` | The repair's details as tabs: the request and urgency, the quotes with the line-by-line check and a paste-a-quote tool, repair or replace with the rules shown, and the booking with an editable limit and messages. |
| `/owner/settings` | Settings: account, notifications (text updates, emergency calls, weekly email), what GoHome may do without asking, and your data. |
| `/owner/record` | The home record: every item with brand, model, serial, place, age, a life bar, and the replace cost range. New equipment is added automatically when an installer finishes a job. **Edit details** on any item corrects a misread brand, model, serial number, or place. The tenant's My home, the picture guides, and what GoHome says in the chat all use the corrected record right away, and **Put the recorded details back** undoes it. |
| `/owner/forecast` | 5-year replacement forecast with a CSS bar chart and a set-aside per year and per month. |
| `/owner/rent` | Rent change check. It starts from the lease (current rent, last increase, anniversary), suggests a raise that is under California's yearly limit (AB 1482) with one tap to use it, rounds every money box to the cent, refuses blank or absurd numbers instead of guessing, gives the last day to send the notice for the start date you want, writes a notice that matches the change (increase, decrease, or none), and **sends it from the page** (the tenant is texted, and nothing is really mailed). |

**Live preview.** One person can only look at one side at a time, so a banner at the top of the main screens says what the other person is seeing right now ("The owner sees ...") and offers one tap to act as them ("Act as the owner: Approve", "Act as the tenant: That works", "Fast-forward: the plumber finishes", "Act as a contractor: send a quote"). Follow the banner from either side to walk the whole repair. It is hidden on the Pay and Settings pages and can be hidden for a step (`lib/agents/prompts.ts`).

**Final defect list (round 7).** What changed, in short:
- *Safety:* the owner is never told the tenant already shut things off; the gas answer has a tap-to-call number (a PG&E-style gas emergency line, written in the text as `1-800-743-5000`, so check it before real use) and asks for a reply only after the tenant is outside.
- *State:* every save first picks up what another tab saved, and open tabs update on their own (`lib/store.tsx`), so a stale tab can no longer wipe another tab's changes. Record edits (including installed year and what it is) reach the request page, the repair or replace advice, the forecast, and the vendor message. Marking a job done goes through the agent, so the owner's feed records it.
- *Chat:* a second problem during a repair is logged as its own request (with a **Your requests** list), quick replies show what was tapped, long messages show a counter, times are the real time each message appeared.
- *Rent:* one big sticky verdict, a hard stop on a third increase in 12 months, an earlier increase lowers the room left, the letter uses the start date you pick and says how it is delivered, notices you sent are logged, and a changed number marks the sent notice out of date. Two one-tap amounts (max legal, modest) show the yearly difference.
- *Quotes:* a license or phone number is never read as a price, a quote that does not add up gets no verdict until the owner chooses, and the possible savings are explained.
- *Decisions that were left open:* CPI stays a labeled sample number (no network in this build) with a link to the BLS figure; local ordinances stay a warning; the 30 or 60 day rule is for ending a tenancy, not for rent increases, so it is not asked; the product keeps the name GoHome.

**Review round 8.** Fixes from a full walk-through as both sides:
- *Tenant:* the safety question is asked before anything is logged as "not an emergency"; buttons read Yes, No, and Help; GoHome does not wait for a Done tap, it starts on the plumber as soon as the safe steps are sent; the guide and the log agree on the steps; the guide says a closed valve makes a T; it asks for a photo of the drip; no copy assumes it is night; web chat no longer says "Delivered"; tenants no longer see serial or lot numbers; "where" is described by the garage door, not a compass point.
- *Owner:* late rent is the first card in the Inbox (money owed comes before approvals) with a reminder that texts the tenant the late fee from the lease, and the tenant's My home shows the same late status; vendors are named in full; the repair or replace rule runs before the vendor pick and only calls the tank leaking when a photo shows it; the activity feed is grouped by job with finished jobs folded away; counter-offer cards have real titles; times from an earlier day say so.
- *Record, forecast, rent:* life bars are full at the typical life and say how far past; the forecast has a cash check ("you would be short in 2026"), takes a booked heater out of the plan, and no longer shows a warning icon for things that are only due within five years; the recommended 5% raise is the primary button and the exemption (an individual owner of a single family home) is spelled out with a draft notice; the last increase is December 2024, which fits the December anniversary.
- *Navigation:* Switch goes straight to the other side; both footers have the same links; the welcome page has no current tab.
- *New:* snap-the-data-plate adds equipment to the record, forecast, and tenant's My home; smoke and CO detectors with a monthly test reminder; a slider in owner settings sets the repair size GoHome may book without asking; the welcome page has "Play the whole story", which runs a repair from report to done and switches between the tenant and the owner by itself.

**Phone preview.** `/tenant/texts` (linked from the tenant Help page and Settings) shows a phone mockup of how GoHome will feel by text in the full product. It runs its own copy of the agent, so it never touches the real conversation. Tap a message, type to it, or press "Play the whole story" to watch a leak go from the first text to "All fixed".

**Shell.** The welcome page, About, Pricing, and Feedback share one header (About, Pricing) and one footer (Pricing for non-tenants, Our team, Help and FAQ, Contact, Send feedback, Reset sample data). Reset asks first, stays on the page, and says it is done. Texting and calling are described as "in the full product" wherever the sample does not really do them.

**Also:** `/pricing`, `/about` (the leadership team, FAQ, and how prices work), `/feedback` (interview notes). The footer has "Send feedback", "Reset sample data", and `?reset=1` works on any page. The old demo consoles (`/live`, `/sms`) and the old label and tenant step pages redirect.

The agents are one pure reducer, `(world, event) => world`, in `lib/agents/engine.ts`, so they are deterministic and unit tested (`tests/agents.test.ts`). The design and architecture are in [`docs/BLUEPRINT.md`](docs/BLUEPRINT.md). The screens replay the timeline with typing pauses so it feels live.

Who does what, shown with a small chip on every step in the owner's activity panel:

| Chip | Meaning |
| --- | --- |
| AI | Reads photos and writes text. |
| Fixed rule | Decides prices, rules, thresholds, and the legal cap, from hand-checked tables. Screens say "A fixed rule, not AI." next to those numbers. (In the code this engine is still called `code`.) |
| GoHome acts | Sends, books, and notifies, inside limits the owner set. |
| A person taps | Nothing is spent without this. |

## The team

"The team behind GoHome" on `/about` is data in `lib/team.ts`: Grayson Ando (Co-founder & CEO), Ezekiel Thun (Co-founder & Head of Design), and Hayden Haar (Co-founder & Head of Finance). Each card has a photo, name, role, a short bio, and a small LinkedIn icon link. On desktop the three cards sit in one row and lift 4px on hover. On a phone they stack and each fits in about half a screen. Cards fade in as they scroll into view (not with reduced motion).

- **Photos:** `public/team/grayson.jpg`, `ezekiel.jpg`, and `hayden.jpg` (480px squares). To change one, replace the file (png, jpeg, and webp also work) and redeploy. If a file is missing, the avatar shows initials on its own brand shade.
- **Bios:** each is the role plus, where known, one credential. Grayson's (family rental in San Jose, Business Operations Analyst at SanDisk) and Hayden's (capital markets and corporate development at Vantage Data Centers) came from the team, so **check the wording**, especially Hayden's. Ezekiel's bio has no credential yet because none was provided. Add one sentence to his `bio` in `lib/team.ts`.

## What is REAL vs FAKED

| Real (plain code, unit tested) | Faked |
| --- | --- |
| Repair vs replace rule (`lib/decision.ts`) | All AI outputs: triage (keyword rules plus the seeded scenario), label reading, quote commentary, message drafts (`lib/mockAI.ts`) |
| Forecast math, yearly and monthly set-aside (`lib/forecast.ts`) | Photo reading. Any photo gives the same sample result. |
| AB 1482 math, notice period, notice text (`lib/rent.ts`) | Vendor data, vendor names, licenses, and quotes |
| Quote comparison and verdict thresholds (`lib/quote.ts`), vendor recommendation and spending limit (`lib/recommend.ts`), quote text parser (`lib/quoteParse.ts`) | Every price, market range, typical lifespan, and the CPI figure |
| Emergency and no-heat keyword rules (`lib/triage.ts`) | The agent log is scripted from the real rules and numbers (`lib/scenario.ts`, `lib/agentLog.ts`) |
| Saving to localStorage, Reset sample data, feedback notes | Sending messages. "Approve and send" sends nothing. |
| | "Owner notified", the confirmation timeline times, and the installer's automatic record (the integration is simulated) |

## Assumptions

I made these calls without asking. Please check the ones that matter to you.

**Process**
- **Branch name.** Work was done on the branch the build environment assigned (`claude/porchlight-tmp-122-prototype-0ig6fp`) instead of a branch named `prototype-v1`. The PR goes from that branch into `main`. Nothing was pushed to `main`.
- **Next.js version.** The latest stable (16.4) was used. The generated config turned on two experimental options (`cacheComponents`, `partialPrefetching`). I removed them to keep classic App Router behavior. I also set `agentRules: false` so `next dev` does not write an `AGENTS.md` file into the repo.
- **Dev dependency.** `@types/node` is pinned to 22 to match the Node version and satisfy Vitest.
- **Icons and design.** Icons are [Phosphor Icons](https://github.com/phosphor-icons/react) (MIT license). The look (flat design, blue and orange, Plus Jakarta Sans from Google Fonts through `next/font`, 44px tap targets, visible focus, reduced motion respected) follows the recommendations of the [UI UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) design skill, run for a trustworthy home-services app.
- **Security scan.** An automated DAST scan hook was suggested, but it needs an API key that is not set in this environment, so no scan was run. The app has no backend, so there is little to scan.

**Product**
- Screens opened directly fall back to the sample scenario, so any screen works on its own.
- **One agent, two people.** The agent's whole world (messages, tool log, house record, pending timers) is saved in the app state, so the tenant screen, the owner inbox, and the detail pages are three views of the same conversation. Replies appear with a short typing pause. Vendor quotes arrive on their own a few seconds after the tenant finishes the safe steps (`components/AgentDriver.tsx`). The older detail pages (record, quote, decide, book, forecast) are kept in step by `lib/agents/sync.ts`.
- **Roles.** If something is not relevant to a person, it is not on their side. The tenant side is a chat, "My home", and the guides. Quotes, repair or replace, the forecast, rent increases, and prices are owner decisions and never appear for tenants (a test checks the tenant pages and links for them). The agent panel is filtered the same way: `lib/agents/views.ts` maps each step to plain tenant wording, and any step it does not know is hidden from tenants by default.
- **The house record is already complete.** Brand, model, serial, size, fuel type, where the item is, and the warranty were recorded at move-in from each data plate and the home inspection (sample data). So nobody is ever asked to photograph a label, and the old label screens are gone. Because the model is known, GoHome can say "the blue-ringed valve on your Hearthline HL-40G-NG" in a guide. When an installer finishes a job, the new equipment is added automatically (simulated by the **Mark done** button). Earlier versions started the record from a label photo; the product direction changed.
- **Guides are pictures, not video.** Where words are hard, each step has an original SVG drawing that outlines the part (`components/GuideScene.tsx`), and "Play as a short video" steps through them on a timer. There is no real video, so nothing is downloaded. A real version could add recorded clips per model.
- **Emergencies skip fix steps.** Gas smell and similar emergencies tell the tenant to get safe and call for help, and ring the owner right now. No guide is offered and nothing is quoted. No-heat problems also alert the owner with no fix steps. Ordinary "soon" problems (the heater leak) give the owner a silent heads-up, not a call. **Urgency uses the three buckets from the product spec: EMERGENCY, SOON, ROUTINE.** Whether the sample water heater leak should be an emergency is a team call that is still open. It is "soon" here because the tenant is only asked to close the water valve and stay away from electricity.
- **Plain code decides, AI only reads and writes.** Quote verdicts, the recommended vendor, the spending limit (quote plus 10%), repair or replace, the forecast, and the rent cap are plain code. The recommended vendor is the cheapest quote that is a fair price from a vendor that shows a license. A missing permit line is flagged, not hidden.
- **The agent logs are scripted** from the real rules and numbers. Times (4:07 AM and so on) are sample times.
- The quote screens and booking are written for the water heater scenario. Other kinds of requests get triage and safety steps, but the quote, decide, and book screens still show the water heater job.
- The tenant's answers to the follow-up questions are saved and shown to the owner. The tenant's "That time works" is shown on the owner home.
- The "Mark done" button stands in for the plumber reporting that the job is finished. It exists to show the record updating by itself.
- Triage uses plain keyword rules (`lib/triage.ts`): gas, carbon monoxide, smoke or sparks, and flooding always give an EMERGENCY result with safety steps (for a gas smell: leave the home, no sparks, call 911 or the gas company). A water heater problem gives the seeded scenario. Other problems get a short generic result for their category (plumbing, HVAC, electrical, appliance, and so on). It is a keyword match, not real understanding.
- Water heater age is `2026 minus the manufacture year` (March 2015 gives 11 years). After the replacement, the forecast uses the new heater (installed 2026, due 2036).
- The repair estimate is $450, and the "replace" cost is the best quote GoHome picked (Willow Glen, $2,450). A leaking tank cannot really be repaired, so the repair number is for comparison only.
- Per-line market ranges for the quote (unit, permit, and so on) were invented so each line can be compared. Only labor is flagged "high" for the seed quote. The expansion tank is flagged "ask" by the mock AI, not by the math.
- Possible savings on a single quote are shown only when it is above the top of the range. Low is the amount over the top, high is double that. Separately, the plan shows how much the picked quote saves compared with the highest quote ($400).
- The not-to-exceed amount starts at the quote plus 10%, rounded to the dollar, and resets when the vendor changes.
- Photos are not uploaded anywhere. Large photos are shown but not kept after a reload (localStorage is small).
- The sample contact uses a reserved fictional phone range (555 01xx) and `example.com`.

**The agents**
- **Standing permission.** GoHome may ask vendors for quotes without a tap, because that commits nothing. It may not book, negotiate, or spend without a tap. Every third-party message the owner approves is sent word for word.
- **Rent notices are mailed, not texted.** A statutory notice has to be properly served. The sentinel's tap simulates certified mail with tracking and proof of service. A real version should also respect what the lease allows (for example email service).
- **Emergencies** (gas smell, smoke or sparks, flooding, water near electricity, no heat) call the owner by voice and text, skip fix steps, and start no quotes. A new emergency interrupts any case in progress.
- **The owner gets a silent heads-up** for a "soon" problem that is not an emergency, and one decision card when the quotes are in. If the owner does not answer in 45 minutes, GoHome sends a reminder and calls.
- **The agent wording is deterministic sample text** in the same spirit as `lib/mockAI.ts`. Typed tenant and owner replies use simple keyword matching, with a polite fallback.
- **Times** are simulated. The story starts at 4:07 AM, the lease check runs on a later Monday at 9:00 AM, and the sample notice date is October 19, 2026.
- **Quotes and photos are samples.** Any quote photo gives the same sample reading, and the tenant's photo of the problem is the same sample picture.

**Safety guides**
- Each safety step has a hand-written "How to do this" guide (`lib/safetyGuides.ts`) and the tenant also gets picture guides tied to the exact equipment (`lib/homeGuides.ts`): time needed, what you need, numbered steps with a drawing each, and a "Stop and get help if" list.
- The guides are **written by hand, not generated by the AI**, because safety advice should be reviewed. The AI only chooses which safety steps apply.
- **A tenant is never told to touch a gas valve, light, or relight anything.** For a gas smell (or dizziness near a gas appliance, which can mean carbon monoxide) the steps are get out and call for help. For the heater leak the steps are: close the water valve, keep items off the floor, stay away from electricity if standing in water, and "if you smell gas at any time, leave and call 911. Do not touch the gas valve." Shutting off the gas is left to the plumber.
- Every other common problem (clogs, an overflowing toilet, appliances, electrical, pests, roof) gets 2 to 4 safe steps that match it, and the plumbing ones have hand-written guides too.
- Guides do not name real utilities. They tell the tenant to use the emergency number on their gas bill or meter, and to call 911.
- **Before real use**, have a licensed plumber, electrician, and your gas utility review every guide. They are general information, not professional advice.

**Forecast**
- The window is five calendar years: 2026 to 2030. "Within 5 years" means due by 2030.
- Items already past due are counted in 2026, because that is when the money is needed.
- "Set aside per year" is the 5 year total divided by 5, and "per month" is divided by 60, both rounded to the dollar. The roof (due 2034) is left out.
- `CURRENT_YEAR` is a constant (2026) in `lib/forecast.ts`.

**AB 1482 screen** (Draft, not legal advice)
- Cap percent is `min(5 + CPI, 10)`. Maximum new rent is current rent times `(1 + cap)`, rounded **down** to the cent. Money math is done in whole cents.
- Notice period is 30 days if the increase is 10% or less, otherwise 90 days. Exactly 10% counts as 30 days.
- "May be exempt" is shown when **either** (single family home or condo, AND not owned by a REIT, corporation, or LLC with a corporate member, AND the written exemption notice was given) **or** the building is less than 15 years old. The cap calculation is still available underneath.
- The form no longer asks how long the tenant has lived there, because the state cap does not depend on it. A note says so (and that just cause rules start after 12 months). **Please verify this with an attorney.**
- Clearing a number box does not leave a stale result: the result waits with a message until the number is back (and snaps back to the last number when you leave the box). A CPI below 0% or above 10% is flagged, not changed.
- The rent page is labeled "California only, for now", names AB 1482, and links the statute ([Civil Code 1947.12](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CIV&sectionNum=1947.12)). I could not confirm a California Attorney General page address, so the statute is linked instead.
- The cap is really measured over any 12 months. This prototype tests only the single proposed increase against the current rent. If one earlier increase was given, a note says earlier increases count toward the cap.
- Two or more increases in the last 12 months shows a red warning.
- The notice date defaults to today and is editable. The effective date is the notice date plus the notice period.

**Pricing, FAQ, and trust**
- `/pricing` shows $4, $6, and $8 per unit per month, month to month, with what each tier includes. The tier contents are **my draft for the team to change**, and the page is labeled as a placeholder pricing test. Visitors can say which tier they would pick, and the pick shows on `/feedback` and in "Copy all as text".
- `/about` has "How our price ranges work", an FAQ (emergencies, what the tenant sees, what the AI does and does not decide, data, legal advice, states), and a contact section. The contact email is a placeholder (`example.com`).
- The welcome page is deliberately just the name, the line, and two choices. The earlier marketing home page (the who-is-who section, how it works, and the one sentence comparing GoHome with MagicDoor and Hemlane) was removed, so that claim no longer appears anywhere. **If it comes back, check it against the team's competitive analysis first.**
- Routes people expect now work: `/login`, `/tenant/requests/new`, `/requests/new`, and the old multi-step tenant pages redirect to the real page, and an unknown page shows a friendly "We could not find that page" page.

## Placeholder numbers list

Everything below is "Illustrative placeholder, not market data" and is labeled that way where it appears on screen.

| Number | Where it appears |
| --- | --- |
| Market range for a 40 gallon gas water heater swap: $1,600 to $2,600 | Owner quote check, repair or replace, vendor badges on approve and book |
| Line ranges that add up to the $1,600 to $2,600 total: unit $555 to $830, labor $620 to $1,030, permit $100 to $150, haul away $50 to $120, expansion tank $150 to $250, fittings $100 to $180, seismic kit $25 to $40 (a test checks the sum) | Owner quote check |
| Vendor quotes: Bayside $2,850 (7 lines), Willow Glen $2,450 (7 lines), A1 Rapid $2,100 (no permit line, no license shown), and the pasted sample quote (Harbor View, $3,170) | Owner quote check, repair or replace, approve and book |
| Possible savings (computed from the quote) and $400 saved vs the highest quote | Owner quote check, owner home, book |
| Repair estimate $450 | Owner repair or replace |
| Typical life and replace cost: water heater 10 yrs, $1,600 to $2,600; furnace 18 yrs, $4,500 to $7,000; air conditioner 15 yrs, $5,500 to $8,500; dishwasher 10 yrs, $700 to $1,200; refrigerator 14 yrs, $1,100 to $1,900; roof 25 yrs, $9,000 to $15,000 | Owner home record, repair or replace (water heater), forecast |
| Forecast totals and "set aside per year" (computed from the row above) | Owner forecast |
| Local CPI change 3.0% | Owner rent increase |
| AI confidence 82% (triage) | Owner request |
| Sample times in the confirmation timeline and the agent activity | Booking, agent panels |

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

- It is a sample build: no accounts, no database, no real sending, one seeded scenario, one property.
- Mock triage is keyword based and will misread unusual wording. Quote commentary is fixed sample text. The guides cover six situations only.
- Dates and "today" depend on the browser. The forecast is pinned to 2026.
- The rent screen does not track the full 12 month rent history, only the number of increases.
- Data is stored per browser in localStorage. Feedback notes do not sync between devices, so export them after each interview with "Copy all as text".
- Large photos are not kept after a reload.
- Only English, US dollars, and one California property.
- Tested in Chromium. Not tested on Safari or Firefox.
- No automated screen reader testing. Basic accessibility is in place (labels, focus rings, text on every badge, 44px tap targets), but it has not been audited.

## Next steps

- Run the customer interviews and read the notes on `/feedback`.
- Replace `mockAI` with a real provider (see above). Fill the home record from real inspection reports and installer registrations, and record real how-to clips per model.
- Replace placeholder prices with real local data, and ask owners which numbers they trust.
- Have an attorney review the AB 1482 logic, the notice wording, and the local rules (for example San Jose) before anyone relies on it.
- Add multi-property support and real accounts only if interviews show owners want them.

## Audit documents

The master audit is tracked in `docs/`:

- `docs/audit-fix-checklist.md`: every finding with its status and how it was checked.
- `docs/product-roadmap.md`: the 68 product ideas, classified.
- `docs/legal-review-checklist.md`: California legal and licensing items. Not legal advice, and not reviewed by an attorney.
- `docs/competitor-research.md`: historical competitor notes that need fresh research before anyone quotes them.
- `docs/unit-economics.md`: the cost model. Estimates only.
- `docs/metrics-and-readiness.md`: MVP scope, success metrics, and investor and grader questions.

The product is named GoHome. The earlier name Porchlight survives only in the working branch name and in the About page note. Renaming the GitHub repository and any hosting project or domain is a manual step.

