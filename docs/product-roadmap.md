# GoHome product roadmap: the 68 ideas

These 68 ideas come from the original audit. They are a menu, not a build list. The prototype fixes come first, and an idea is only marked built if it really is. A star marks an idea the audit recommended pitching first. The audit describes them as the first ten, but 13 ideas carry a star, so all 13 are marked.

## How the columns work

- **MVP fit**: V1 means it supports the one job version 1 must do (tenant reports a repair, GoHome gives safe steps, GoHome checks the quotes, the owner approves with one tap). Later means after version 1 works. Not yet means do not build until a licensing, legal or partner question is answered.
- **Dependency**: what has to exist first.
- **Risk**: Low, Med or High, counting legal, safety, licensing and trust risk, not just engineering risk.
- **Effort**: S (days), M (weeks), L (a month or more), XL (needs a team, real data, or a business).
- **Status**: what exists in the prototype today.

## Group A: Product vision

| # | Star | Idea | MVP fit | Dependency | Risk | Effort | Status |
|---:|:---:|---|---|---|---|---|---|
| 1 | ★ | House health, not inventory (merge Home Record and Forecast) | Later | Home record, forecast | Low | M | Partly built: both screens exist separately and share data |
| 2 |  | Predict from evidence, not age | Later | Real repair history, enough homes | Med | L | Not built |
| 3 | ★ | Photo diagnosis | Later | Real vision model, plumber review | High | L | Mock only: a sample photo gives a fixed reading |
| 4 |  | Plan the year (seasonal plan) | Later | Home record, reminders | Low | M | Not built |
| 5 |  | Explain everything (Plain code tags) | V1 | None | Low | S | Partly built: Plain code notes appear on rules and numbers |

## Group B: Getting data in and keeping it

| # | Star | Idea | MVP fit | Dependency | Risk | Effort | Status |
|---:|:---:|---|---|---|---|---|---|
| 6 | ★ | Solve cold start (tenant photo walkthrough, inspection upload, installer updates) | V1 | Photo upload, extraction | Med | L | Partly built: data plate demo and automatic update after an install |
| 7 |  | Share the record with vendors | Later | Vendor accounts or a share link | Med | M | Not built |
| 8 | ★ | Network data is the moat (failure rates, local prices from invoices) | Later | Many real customers and invoices | Med | XL | Not built, needs real data |
| 9 |  | A published price index | Later | Idea 8 data | Med | L | Not built |
| 10 |  | Owner benchmarks | Not yet | Idea 8 data, defensible comparison | Med | L | Not built |

## Group C: Owner money

| # | Star | Idea | MVP fit | Dependency | Risk | Effort | Status |
|---:|:---:|---|---|---|---|---|---|
| 11 |  | Show annual savings | Later | Real job history, honest method | Med | M | Partly built: a saved-on-this-repair figure from the sample |
| 12 | ★ | Property-manager comparison | V1 | Verified fee assumptions | Low | S | Not built |
| 13 |  | Tenant retention ROI | Later | Verified inflation and vacancy figures | Low | S | Not built |
| 14 |  | Market rent check | Later | A rent data source | Med | M | Not built |
| 15 |  | A real house fund | Later | Idea 1 | Low | M | Not built |
| 16 |  | Financing for big jobs | Not yet | Lender partner, lending rules | High | L | Not built |
| 17 |  | Insurance gap check | Later | Questionnaire, insurance review | Med | S | Not built |
| 18 |  | Home warranty versus self-insurance | Later | Verified warranty prices | Low | S | Not built |
| 19 |  | Rebate finder | Later | Rebate data source | Med | M | Not built |
| 20 |  | Upgrades that pay back in rent | Later | Utility cost data | Med | M | Not built |
| 21 | ★ | Tax treatment, done for you (Schedule E packet) | Later | CPA review of every rule | High | L | Not built. No tax rule here is verified |
| 22 |  | Year-end owner statement | Later | Income and expense records | Low | M | Not built |
| 23 |  | Plan for ten units, not one | Later | Multi-property data | Low | M | Partly built: unit count on pricing only |

## Group D: Legal and compliance

| # | Star | Idea | MVP fit | Dependency | Risk | Effort | Status |
|---:|:---:|---|---|---|---|---|---|
| 24 | ★ | Bay Area gas-appliance rules | Later | Official source check for the 2027 and 2029 dates | Med | M | Not built. Dates are unverified |
| 25 |  | Compliance layer (smoke and CO, strapping, heat, hot water) | Later | Verified rules | Med | M | Partly built: smoke and CO reminder in the record |
| 26 | ★ | Automatic entry notices | Later | Attorney review of Civil Code 1954 | High | M | Not built. Visit time is booked in chat only |
| 27 |  | Security-deposit rules | Later | Attorney check of caps and dates | High | M | Not built |
| 28 |  | Move-in and move-out photos | Later | Photo storage, privacy policy | Med | M | Not built |
| 29 |  | Required disclosures | Later | Attorney review | High | M | Not built |
| 30 |  | Permit checks | Later | City-specific rules | Med | L | Not built |
| 31 |  | Just-cause guardrails | Not yet | Attorney review, local rules | High | M | Not built |
| 32 |  | Habitability response clock | Later | Activity log | Med | M | Not built |
| 33 |  | Audit trail as legal protection (Download the repair record) | V1 | Activity log with timestamps | Low | S | Partly built: the log has timestamps, no download yet |

## Group E: Tenant experience

| # | Star | Idea | MVP fit | Dependency | Risk | Effort | Status |
|---:|:---:|---|---|---|---|---|---|
| 34 |  | Home manual at move-in | V1 | Guides, photos | Low | M | Partly built: picture guides for shutoff and breakers |
| 35 |  | Speak the tenant's language (Spanish, Vietnamese) | Later | Translation review | Med | L | Not built |
| 36 |  | Tenants pick their own time | V1 | Vendor availability | Low | M | Partly built: one visit time, tenant confirms |
| 37 |  | Satisfaction check after each repair | V1 | Vendor scorecards | Low | S | Not built |
| 38 |  | Credit for on-time rent | Not yet | Credit bureau, rent handling | High | L | Not built. Avail already offers it |
| 39 |  | Renter's-insurance tracking | Later | Document upload | Low | M | Not built |
| 40 |  | Lease-change requests | Later | Lease handling, licensing review | Med | M | Not built |

## Group F: Operations and agent behavior

| # | Star | Idea | MVP fit | Dependency | Risk | Effort | Status |
|---:|:---:|---|---|---|---|---|---|
| 41 | ★ | Automatic warranty registration | Later | Manufacturer and installer data | Med | M | Not built |
| 42 |  | Recall monitoring | Later | Recall data source | Low | M | Not built |
| 43 |  | Cheap leak sensors | Later | Hardware, price check | Med | L | Not built |
| 44 |  | Vendor scorecards | Later | Real jobs | Low | M | Not built |
| 45 |  | Bring your own handyman | V1 | Quote check | Low | S | Partly built: owners can paste any quote |
| 46 |  | Bundle small fixes | Later | Several open jobs | Low | M | Not built |
| 47 |  | Automatic consumable shipments | Not yet | Fulfillment partner | Med | L | Not built |
| 48 |  | Cheaper after-hours triage | V1 | Hand-checked guides, plumber review | High | M | Partly built: hand-checked safe steps. Emergencies are never delayed |
| 49 |  | Turnover checklist | Not yet | Licensing review | High | L | Not built |

## Group G: Portfolio and records

| # | Star | Idea | MVP fit | Dependency | Risk | Effort | Status |
|---:|:---:|---|---|---|---|---|---|
| 50 |  | Leasing from the record | Not yet | Licensing review | High | L | Not built |
| 51 |  | Carfax for rental homes (history report) | Later | Home record, activity log | Low | M | Not built |
| 52 |  | Family roles | Later | Accounts | Low | M | Not built |
| 53 |  | Travel mode | Later | Backup approver, limit | Med | M | Partly built: the auto-approve limit setting |

## Group H: Business model and growth

| # | Star | Idea | MVP fit | Dependency | Risk | Effort | Status |
|---:|:---:|---|---|---|---|---|---|
| 54 | ★ | No vendor money (disclose the business model) | V1 | None | Low | S | Not built on the site yet. It is a policy to state |
| 55 |  | Tenant-side growth engine | Later | Accounts | Low | M | Not built |
| 56 |  | Target the accidental landlord | V1 | Interviews | Low | S | A positioning choice, used in copy |
| 57 |  | ADUs as a wedge | Later | Partners | Low | M | Not built |
| 58 |  | Partner with home inspectors | Later | Report import | Med | M | Not built |
| 59 |  | Partner with real estate agents | Later | Referral rules | Med | S | Not built |
| 60 |  | Pricing experiments | V1 | Owner approval, usage data | Low | S | Partly built: a pricing pick is saved on the pricing page |
| 61 |  | Expansion path | Not yet | Other states' rent rules | Med | XL | Not built |

## Group I: Risk and pitch

| # | Star | Idea | MVP fit | Dependency | Risk | Effort | Status |
|---:|:---:|---|---|---|---|---|---|
| 62 |  | AI liability (hand-checked safety library) | V1 | Plumber review | High | M | Partly built: the safety steps are hand written. No plumber has reviewed them |
| 63 |  | Tenant privacy (who sees photos, how long) | V1 | Privacy policy | Med | S | Not built |
| 64 |  | Owner never taps Approve (escalation rules) | V1 | Owner nudge, backup | Med | M | Partly built: a nudge after a delay |
| 65 |  | Vendor no-shows (backup vendor) | Later | Real vendors | Med | M | Not built |
| 66 | ★ | Lead with one number (average fix time) | V1 | Real measured data, defined method | Med | S | Not built. 26 hours versus 4 days is a hypothesis, not a result |
| 67 | ★ | Show customer evidence (real landlord interviews) | V1 | Five or more interviews, permission | Low | M | Not done. No interviews have been held |
| 68 | ★ | Split-screen demo (tenant and owner side by side) | V1 | None | Low | S | Partly built: live previews and a one-click story, not a true split screen |

Starred ideas: 1, 3, 6, 8, 12, 21, 24, 26, 41, 54, 66, 67, 68.

## Count by MVP fit

| MVP fit | Ideas |
|---|---:|
| V1 | 18 |
| Later | 42 |
| Not yet | 8 |

## Notes

- Ideas 21, 26, 27, 29, 31 and 38 touch tax, entry, deposit, disclosure, eviction or credit rules. None of them should ship without review by a California attorney or CPA. See `docs/legal-review-checklist.md`.
- Ideas 8, 66 and 67 need real customers, real measurements and real interviews. Nothing in this prototype stands in for them.
- Idea 54 (no vendor money) is a promise about fair quote comparisons. It is only true if GoHome never takes referral fees. Say so on the site before claiming it.
- Ideas 49, 50 and the rent collection idea are marked Not yet because of broker license risk.