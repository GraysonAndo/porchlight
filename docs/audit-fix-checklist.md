# GoHome audit fix checklist

This is the working record of the master audit: every finding, where it stands, and how that was checked. It was written during the audit and updated as fixes landed.

## How to read this

- **Fixed**: code or copy was changed. It may not have its own test.
- **Verified**: behavior was tested, either by a unit test, by a browser script, or by a measurement. The note names which.
- **Already resolved**: the problem no longer exists. It was re-checked against the current code before being marked.
- **Blocked**: cannot be done in this environment.
- **Roadmap**: a product or business decision, tracked in `docs/product-roadmap.md` or another doc, not a bug.
- **Requires human review**: needs a person (a licensed plumber, an attorney, a real device).

Nothing here claims a legal opinion, a vendor relationship, a customer interview or a measured outcome. None exist yet.

## Summary

| Status | Count |
|---|---:|
| Fixed | 45 |
| Verified | 28 |
| Already resolved | 15 |
| Roadmap | 1 |
| Requires human review | 1 |
| Open | 1 |
| **Total findings** | **91** |

Round 2 added R01 to R10 (customer-focused). Findings: 54 original (T01 to T13, O01 to O12, H01 to H13, P01 to P09, S01 to S07), 12 extra quote findings (Q01 to Q12), and 15 accessibility requirements (A01 to A15). The 68 product ideas are in `docs/product-roadmap.md`.

## Tenant flow

| ID | Priority | Finding | Status | Verification note |
|---|---|---|---|---|
| T01 | High | Emergency status recorded before the safety question is answered | Verified | tests/agents.test.ts and scripts/e2e.mjs: the electrical question is asked first and no status is recorded until it is answered. |
| T02 | Medium | Water shutoff wording: plus sign | Fixed | lib/homeGuides.ts: the valve step now says the handle sits at a right angle to the pipe, making a T. Wording still needs review by a licensed plumber (see Requires human review list). |
| T03 | Medium | Footwear wording: keep your shoes dry | Fixed | lib/homeGuides.ts: step 1 says to wear dry, rubber-soled shoes, stay out of standing water, and not to go in if water covers the floor around the heater. Wording needs plumber review. |
| T04 | Medium | Night-only copy shown in the daytime | Already resolved | No fixed-time sleep copy remains in lib/ or app/. Re-searched this audit. |
| T05 | Medium | Finishing the picture guide does not complete the chat | Verified | scripts/e2e.mjs: finishing the guide and tapping Done completes the chat and the owner log updates. |
| T06 | Medium | Chat below the fold, two competing scroll areas | Verified | Measured with Playwright at 1460x812: the composer bottom is at 653px and the page is 15px taller than the screen (footer only). At 390x844 the page scrolls as one area. One scroll area on both. |
| T07 | Low | Inconsistent safe-step counts | Already resolved | Step counts come from the guide itself (lib/homeGuides.ts), so the guide, log and summary share one number. |
| T08 | Low | Claims photos were sent when none were | Already resolved | Photo claims are made only after a photo is shared (lib/agents/engine.ts). Covered by tests/agents.test.ts. |
| T09 | Low | Quick replies read 1 Yes, 2 No, HELP | Verified | scripts/e2e.mjs taps plain Yes and No buttons. No numbered or uppercase quick replies remain. |
| T10 | Low | Fake Delivered status in web chat | Already resolved | The web chat shows no delivery status. The only Delivered wording left is Delivered silently, inside the clearly labeled text-message mockup for quiet hours. |
| T11 | Low | Serial and lot numbers shown to tenants | Verified | app/tenant/home/page.tsx: serial and lot numbers sit inside a Details control. scripts/e2e.mjs checks they are not visible by default. |
| T12 | Low | Quietly told your landlord | Already resolved | The phrase no longer exists in the code. Re-searched this audit. |
| T13 | Low | Conflicting leak-location descriptions | Verified | The guide location is read from the home record (lib/homeGuides.ts), so the guide and record agree. scripts/e2e.mjs checks the guide says to the left of the garage door. |

## Owner inbox

| ID | Priority | Finding | Status | Verification note |
|---|---|---|---|---|
| O01 | High | Rent increase prioritized over 20-day-late rent | Verified | lib/agents/engine.ts holds the lease check while rent is unpaid (hold_for_late_rent). tests/agents.test.ts, scripts/e2e.mjs and scripts/final-list.mjs cover it. The rent page also hides its recommendation while rent is late. |
| O02 | Medium | Unit A label on a single-family rental | Already resolved | The single-family rental shows Main house, not Unit A. |
| O03 | Medium | Frozen lease-anniversary countdown | Already resolved | No countdown text is stored. Days left are computed from the date at render (daysUntil in lib/payments.ts). |
| O04 | Medium | Utility both Overdue and due in 10 days | Already resolved | Status and due wording both come from dueStatus() in lib/payments.ts. scripts/final-list.mjs checks that water and trash is not called overdue before it is due. |
| O05 | Medium | Draft card with no context or attachment | Already resolved | The counter-offer card is titled Counter-offer to {vendor} (lib/agents/engine.ts) and shows the draft as an attachment. |
| O06 | Medium | Feed mixes separate quote stories | Already resolved | The activity feed is grouped by job. scripts/final-list.mjs checks the grouping. |
| O07 | Medium | Overconfident tank diagnosis | Fixed | lib/decision.ts has an unknown-leak mode. The rule and the card say the tank is likely leaking and the plumber confirms. tests/agents.test.ts and tests/decision tests cover it. |
| O08 | Low | Vendor picked before the repair-or-replace rule | Verified | The decision is logged before recommend_vendor. scripts/final-list.mjs checks Rule says appears before Picked. |
| O09 | Low | Send button has icon and emoji | Already resolved | The Send button has one icon only. |
| O10 | Low | Timestamps without dates | Already resolved | Feed entries carry dates when the day differs. |
| O11 | Low | Willow Glen reads like a place | Verified | Vendors are named in full everywhere. scripts/final-list.mjs checks Willow Glen Water Heater Co. |
| O12 | Low | Call me is ambiguous | Already resolved | The action reads Talk it through with me. |

## Home record, forecast, rent, settings

| ID | Priority | Finding | Status | Verification note |
|---|---|---|---|---|
| H01 | Medium | Data-plate scan invents details and labels them Read from the photo | Fixed | components/DataPlateDemo.tsx now extracts only what the plate prints (brand, model, serial, year). Type and place are asked for, and a confirm checkbox is required. scripts/final-list.mjs covers the refusal and the confirmed save. |
| H02 | Medium | Forecast hides irregular expenses | Already resolved | app/owner/forecast/page.tsx shows year by year cash flow with the running balance and flags shortfalls (Will your set-aside cover it?). This audit added a Not included note for repairs, turnover, vacancies, insurance and taxes. |
| H03 | Low | Scanned plate disappears after scanning | Fixed | The plate image stays beside the extracted result. |
| H04 | Low | Edit stretches one card | Fixed | Editing opens in a dialog (app/owner/record/page.tsx), so the card no longer stretches. scripts/e2e.mjs and scripts/final-list.mjs use the dialog. |
| H05 | Low | History entry lacks date, vendor, cost | Fixed | History shows the check mark, the date, the vendor and the cost. |
| H06 | Low | Replacement heater has the old model | Fixed | The replacement heater is model HL-40G-NX (lib/seed.ts). scripts/e2e.mjs checks the old model is gone from My home. |
| H07 | Low | Two stacked status pills | Fixed | One status pill per item. The replaced heater shows New, added automatically. |
| H08 | Low | 0% life bar looks broken | Fixed | A new item reads New, about N years of life left. |
| H09 | Low | Life bar beyond 100% with unlabeled tick | Fixed | Life bars are capped visually, the text says how many years past typical life, and the underlying number is unchanged (components/Bars.tsx). |
| H10 | Low | Orange Already filled in banner dominates | Fixed | The note is a gray, small sentence. |
| H11 | Low | Rent page highlights Max legal, inbox recommends 5% | Verified | The rent page and the inbox both lead with Recommended (5%). Max legal is the second option. scripts/final-list.mjs checks the order. |
| H12 | Low | Last increase 14 months ago vs December anniversary | Already resolved | The sample lease says last increase December 2024, anniversary December 14, 2026. scripts/final-list.mjs checks it. |
| H13 | Low | Empty settings phone fields | Verified | Phone fields are prefilled from the saved settings. scripts/final-list.mjs checks both. |

## Pricing page

| ID | Priority | Finding | Status | Verification note |
|---|---|---|---|---|
| P01 | Medium | Pro says sending the notice, FAQ says drafts | Fixed | app/pricing/page.tsx: Pro says Notice drafts, ready for you to send. |
| P02 | Medium | Coming soon features look shipped | Fixed | Planned features carry a Coming soon badge and a clock icon instead of a check mark. |
| P03 | Low | Yearly price typography | Fixed | Yearly price is a small second line in the same type as the monthly line. |
| P04 | Low | Selected-plan button label and alignment | Fixed | Buttons read I would pick {tier}; the picked one reads You picked {tier}. A reserved message area keeps the buttons aligned. scripts/e2e.mjs covers it. |
| P05 | Low | Unit-count label on the box border | Fixed | How many units do you own? is now a proper heading with a radio group. |
| P06 | Low | Inconsistent per-unit wording and punctuation | Fixed | The copy says per unit per month everywhere. |
| P07 | Low | Repeated feedback link | Fixed | The footnote points to the existing Send feedback control instead of repeating it. |
| P08 | Low | No volume pricing | Roadmap | Volume pricing is a business decision, so no discount was invented. Ten units still cost ten times one unit. See docs/unit-economics.md. |
| P09 | Low | No upgrade hint on Starter | Fixed | Starter shows an upgrade hint for quote checks. |

## Site-wide

| ID | Priority | Finding | Status | Verification note |
|---|---|---|---|---|
| S01 | Medium | Conflicting product names (GoHome / Porchlight) | Fixed | GoHome is the canonical name. package.json and package-lock.json now say gohome. The About page explains the old Porchlight name. MANUAL: rename the GitHub repository, the Vercel or hosting project, and any domain from porchlight to gohome. The working branch name still contains porchlight on purpose. |
| S02 | Low | Inconsistent header and footer navigation | Verified | Header: About, Pricing. Footer: Pricing, Our team, Help and FAQ, Contact, Send feedback. No two links go to the same place. scripts/e2e.mjs checks it. |
| S03 | Low | About page title says Help and FAQ | Verified | The /about title is About / GoHome. scripts/final-list.mjs checks the per-page titles. |
| S04 | Low | Shared meta description, no social preview tags | Fixed | components/Shell.tsx adds a page-specific description and Open Graph and Twitter tags to every page. The shared description in app/layout.tsx was removed. No preview image is set because no image asset exists yet. |
| S05 | Low | Feedback Back to GoHome goes to /tenant | Fixed | Back to GoHome on the feedback page goes to /. |
| S06 | Low | Home page highlights Pricing | Verified | No header tab is marked current on the welcome page. scripts/final-list.mjs checks it. |
| S07 | Low | Repeated placeholder disclaimers | Fixed | Checked on nine pages. Each page shows one placeholder note. The forecast had two, and one was removed. The rent notice repeats DRAFT, NOT LEGAL ADVICE in the letter on purpose, because the letter gets copied out of the page. |

## Quote page (extra)

| ID | Priority | Finding | Status | Verification note |
|---|---|---|---|---|
| Q01 | High | Permit exclusion distorts the fairness verdict | Fixed | lib/quote.ts normalizeQuote adds a typical permit when a quote leaves it out and shows original price, adjustment and adjusted total. tests/quote.test.ts and tests/recommend.test.ts cover it. Amounts come from the configured price data. |
| Q02 | Medium | Fake CSLB 000000 identifiers imply verification | Fixed | lib/seed.ts uses distinct fictional CSLB numbers labeled fictional and not verified. No page implies a license was checked. |
| Q03 | Medium | Quote near top of range, not explained | Fixed | The quote page shows where the total falls in the range and flags lines at or near their maximum (rangePosition, nearTopLines). tests/quote.test.ts covers it. |
| Q04 | Medium | Why the pick is not the cheapest is not explained | Fixed | lib/recommend.ts comparisons explain the recommended vendor against the cheapest and the highest quote using adjusted totals and documented differences. |
| Q05 | Medium | Missing availability, warranty, size, fuel, expiry | Fixed | VendorDetails in lib/seed.ts: availability, parts warranty, labor warranty, unit size, fuel, quote validity. Missing fields show Not provided. |
| Q06 | Medium | Vendor chosen before repair-or-replace decision; tab order | Fixed | Tab order is Request, Decision, Quotes, Booking (lib/steps.ts). The decision uses a typical replace cost, so it no longer depends on a vendor pick. The $450 repair option stays visible on the quote page. scripts/e2e.mjs checks the tab order. |
| Q07 | High | No clear approve action or spending cap on quotes | Fixed | The quote page has an approve bar: Approve {vendor} for {amount} (cap {amount plus 10%}), plus Ask {vendor} to match and Add another quote. The cap is computed. Approval and cap go to the activity log. |
| Q08 | Low | Get a second quote when three exist | Fixed | The action reads Add another quote and the text states how many quotes exist. |
| Q09 | Low | Stale Harbor View reference in the photo note | Fixed | The photo note names the active vendors only. |
| Q10 | Low | Header settings label and Sample OwnerOwner | Fixed | components/SiteHeader.tsx: Settings has an accessible name, and a visually hidden comma separates the name from the role so it reads Sample Owner, Owner. scripts/a11y.mjs checks for glued names. |
| Q11 | Medium | AI loading states can hang | Verified | lib/hooks.ts useAsyncResult times out after 8 seconds and offers Retry and a fallback. window.__gohomeAiDelayMs is a test hook. scripts/e2e.mjs forces a 30 second delay and sees Retry after about 8 seconds on both the request and quote pages. |
| Q12 | Low | Duplicate step numbers | Verified | No duplicated step numbers remain. Decorative numbers are hidden from assistive technology. |

## Accessibility

| ID | Priority | Finding | Status | Verification note |
|---|---|---|---|---|
| A01 | Medium | 911 link is a tiny link, not a Call 911 button | Fixed | components/Sms.tsx: 911 is a red button-sized link (44px minimum) with the accessible name Call 911. scripts/a11y.mjs checks the emergency reply. |
| A02 | Medium | 11 px text on Tenant Help and Owner Inbox | Verified | All text-[11px] was replaced with text-xs (12px). scripts/a11y.mjs finds no text under 12px on 19 pages at 3 widths. The Owner Inbox and Tenant Help were included. |
| A03 | Medium | Owner Inbox links are small | Verified | scripts/a11y.mjs flags no link or button under 24px, and the calendar reminder link on the rent page is now 44px tall. Inline links inside sentences are exempt from the target size rule. |
| A04 | Medium | Rent exemption checkboxes are 24 px | Verified | Checkboxes are 24px (h-6 w-6) and their labels are clickable, including the pay checkboxes. scripts/a11y.mjs checks the minimum. |
| A05 | Low | Other small inline links and tap targets | Verified | Same script check. Only inline links inside sentences remain below 44px. |
| A06 | Medium | Headings, focus, keyboard, contrast, names, announcements | Verified | scripts/a11y.mjs checks titles, lang, one main, one h1 per page, no skipped heading levels, accessible names, duplicate ids, contrast (WCAG AA ratios, computed from styles) and a visible keyboard focus ring. Status announcements use role=status where used. Round 2 read the Playwright accessibility tree of the tenant chat and owner inbox (landmarks, headings, names, order) and found the order sensible. Screen reader behavior itself was NOT tested with VoiceOver or NVDA. |
| A07 | Medium | No horizontal scroll at mobile widths, all pages | Verified | scripts/a11y.mjs: no horizontal scroll at 360, 390 and 1280 on 19 pages, plus guide, approval card and emergency states. |
| A08 | Low | Tenant bottom tabs: Chat and Activity | Verified | The tenant tab bar and the Chat and Activity tabs were exercised at 390px in scripts/e2e.mjs. |
| A09 | Low | Loading speed and Lighthouse | Verified | Round 2: Lighthouse 13.5.0 ran against the production build on a local server (mobile profile, preinstalled Chromium). Accessibility 100 on 9 pages (welcome, tenant, tenant home, pay, owner, quote, rent, pricing, about). Best practices 100 and SEO 100 on all 9. Performance 67 to 97. Weakest: Pay 73 (layout shift 0.395, a client hydration swap that moves only the footer) and Quote 88 (shift 0.108 at hydration). Not fixed, see R09. This was a local run, not the deployed site. |
| A10 | Medium | Tenant Pay page, owner toggles, real phone widths | Verified | The Pay page, owner settings and toggles are in the a11y route list and pass at phone widths in an emulated browser. Not a real phone. |
| A11 | Medium | Real-device test (iOS Safari) | Requires human review | Round 2 added scripts/phone.mjs: emulated 320px phone, landscape phone and 200% text on 14 pages (no horizontal scroll, no clipped text) and a real touch-tap journey. That is Chromium emulation only. A real iOS Safari and Android Chrome test is still needed. |
| A12 | Low | Header settings control accessible name | Fixed | The header Settings link has the accessible name Settings. |
| A13 | Low | Sample OwnerOwner | Fixed | The name and the role are separated for assistive technology (see Q10). |
| A14 | Low | Duplicated step numbers | Verified | See Q12. |
| A15 | Medium | Every visible control performs its advertised action | Verified | scripts/e2e.mjs, scripts/final-list.mjs and scripts/walkthrough.mjs click through every control on the main flows. Not every control on every state was clicked, so this is broad, not exhaustive. |

## Round 2: customer-focused findings

These came from walking the product as a stressed tenant on a phone and as an older owner who is not technical. IDs start with R.

| ID | Priority | Finding | Status | Verification note |
|---|---|---|---|---|
| R01 | High | The owner's job tracker said Quoted while the tenant was still being asked a safety question and no quotes existed | Fixed | lib/jobStatus.ts now reads the agent stage. tests/jobStatus.test.ts and scripts/e2e.mjs cover it. |
| R02 | Medium | Two buttons did the same thing on the owner inbox when rent was late (Mark as paid and Mark rent as paid), and the overdue rent was explained twice | Fixed | The rent card drops its own button while the late-rent card is showing. scripts/e2e.mjs checks there is exactly one. |
| R03 | Medium | A tenant on a phone saw a cut-off prompt in the chat box (Tell GoHome what is wron) | Fixed | The prompt is now What is wrong? (owner side: Message GoHome). scripts/e2e.mjs checks it. |
| R04 | Medium | Owners saw the label Plain code, which means nothing to a non-technical person | Fixed | The label now reads Fixed rule, and the note says A fixed rule, not AI. The engine is still called code inside the program. |
| R05 | High | A tenant had no always-visible way to reach 911, only inside the chat after typing something | Fixed | The Help page now opens with a short line and a 44px Call 911 button. scripts/e2e.mjs checks it. Wording needs plumber and attorney review like the other safety copy. |
| R06 | Medium | With one request open, the tenant had no plain statement of where it stood | Fixed | The Help page shows Where things stand with the status in plain words, announced politely to screen readers. scripts/e2e.mjs checks it. |
| R07 | Medium | An owner could not keep a dated record of what happened on a repair (roadmap idea 33) | Fixed | Home record has a Download the repair record button. It is built from the activity log with full dates, and says nothing when there is no history. tests/repairRecord.test.ts and scripts/e2e.mjs cover it. |
| R08 | Low | The page used min-h-screen, which is taller than the visible area on iPhone Safari with the address bar showing | Fixed | Changed to min-h-dvh. Not verified on a real iPhone. |
| R09 | Low | Layout shift at load on Pay (0.395, footer only) and Quote (0.108) | Open | Both happen once at about 100 to 150 ms when the page swaps from its server version to the version with saved data. Nothing visible jumps on screen in a normal load. Fix would need a skeleton that matches each page. Not done. |
| R10 | Medium | Does the product survive a 320px screen, a landscape phone and text zoomed to 200%? | Verified | scripts/phone.mjs: no horizontal scroll and no clipped text on 14 pages in all three modes. |

## Needs manual verification

- Real device test on iOS Safari and Android Chrome (A11).
- Lighthouse accessibility and speed run on the deployed build (A09).
- Screen reader pass with VoiceOver and NVDA (A06). The script checks names and structure, not how it sounds.
- A licensed plumber should read every safety guide step (T02, T03) and the emergency copy.
- Rename the GitHub repository, hosting project and any domain from porchlight to gohome (S01).
- Every legal item in `docs/legal-review-checklist.md`. A California real estate attorney has not reviewed anything.

## Related documents

- `docs/product-roadmap.md`: all 68 product ideas, classified by MVP fit, dependency, risk and effort.
- `docs/legal-review-checklist.md`: California legal and licensing items with source, uncertainty and verification status.
- `docs/competitor-research.md`: historical competitor notes, and the list of claims that need fresh research.
- `docs/unit-economics.md`: the audit's cost model, its assumptions and what it leaves out.
- `docs/metrics-and-readiness.md`: the MVP recommendation, 7 success metrics, and the investor and grader questions.
- `scripts/a11y.mjs`: the accessibility and responsive script behind A01 to A15.
