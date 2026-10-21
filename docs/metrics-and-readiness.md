# MVP scope, success metrics, and investor and grader questions

## MVP recommendation (from the audit)

Version 1 should do one job from start to finish:

**A tenant reports a repair, GoHome gives safe steps, GoHome checks the quotes, and the owner approves with one tap.**

Keep that as the default focus. Do not widen a bug-fix pass into a feature build because an idea sits on the roadmap.

**In scope for version 1**

- Tenant text intake and safe steps from a hand-checked library.
- A basic home record filled in with tenant photos.
- Quote checking against a price table.
- One-tap owner approval with a spending cap.
- An activity log with timestamps.

**Later:** the five-year forecast and set-aside plan, rent increase checks and notices, a tax packet, warranty registration, a home-history report, a seasonal plan and sensors.

**Not yet:** rent collection (licensing risk), listings and leasing, vendor referral fees, and expansion to other states.

The audit also suggests the rent-cap calculator could work as a low-cost standalone tool to bring in owners. That is a product decision, not a code change.

What the prototype covers today: all of the version 1 items as a clickable demo with sample data, plus several "Later" items (forecast, rent checks, draft notices). Nothing is connected to a real tenant, vendor or payment.

## Success metrics (candidates, with no targets)

No targets are set. The audit says to set them after five pilot owners. There is no real data yet, and none is invented here. No analytics code was added: the prototype collects no personal data, and that should stay true until a privacy plan exists.

| # | Metric | Why | How to measure |
|---|---|---|---|
| 1 | Minutes from report to booked visit | The core promise | Activity-log timestamps |
| 2 | Share of requests solved by safe steps with no visit | Cost avoided | Completed tenant steps where no job follows |
| 3 | Share of approvals tapped within 24 hours | Owner trust | Approval timestamps |
| 4 | Quote savings versus the highest quote | Owner value | Approved quote against the alternatives, adjusted for scope (the quote page already shows adjusted totals) |
| 5 | Support minutes per owner per month | Decides whether pricing works | Track support time |
| 6 | Tenant rating after each repair | Retention signal | One-question response (not built, roadmap idea 37) |
| 7 | Owner retention at 90 days | Whether owners stay | Active owners against signups |

The headline number the audit suggests, "Average fix time: 26 hours vs 4 days", is a hypothesis. It becomes a claim only after metric 1 is measured on real jobs.

## Investor and grader questions

Each answer is the position the team can take today. "Still needed" is the evidence that does not exist yet. Nothing here has been done on someone's behalf.

| Question | Position today | Still needed |
|---|---|---|
| Who is the customer? | Self-managing California owners with 1 to 10 units, especially accidental landlords | Five owner interviews. None have been held |
| Why not Hemlane or Latchel? | They lean on human operations or sell to property managers. GoHome checks quotes and plans spending for smaller owners at a lower price | Call each as a prospective customer and check their prices, workflow and positioning (see `docs/competitor-research.md`) |
| Does the pricing work? | Only if there is a viable base fee and human support stays close to zero (see `docs/unit-economics.md`) | Real usage, support and churn data |
| Who actually shows up to fix the problem? | A vetted vendor list by city, paid promptly, with no pay-to-play that compromises quote fairness | At least two real vendors willing to pilot it. The vendors in the demo are fictional |
| Is it legal without a broker license? | The owner approves every action and GoHome never holds rent | Review by a California real estate attorney (see `docs/legal-review-checklist.md`) |
| What if the AI is wrong? | Safety steps come from a hand-checked library. Prices, rent caps and repair rules come from deterministic code. Spending is capped at the quote plus 10% | A licensed plumber reviews the written safety steps. Someone validates the legal and pricing rules |
| How does the data get in? | Tenant photo walkthrough, inspection report upload, installer updates | A working version of the first data-entry workflow. The data plate demo is a start, using a sample plate |

Do not fabricate interviews, vendors, measured outcomes, legal opinions or customer quotes to fill these in.
