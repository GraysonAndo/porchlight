# Pricing and unit economics (estimates, not measured data)

**Every number here is an estimate from the original audit. None of it comes from real customers, real usage or real invoices.** The site must not present these as proven savings or measured economics. Pricing and growth experiments are business decisions that need the owner's approval, so the prototype's prices were not changed because of this model.

## External prices the audit recorded (October 21, 2026)

- Twilio: $0.0083 per US text segment, plus carrier fees of $0.0025 to $0.005, plus $1.15 a month per leased number. The audit had no dollar amount for 10DLC registration.
- Claude: Sonnet 5.5 at $2 input and $10 output per million tokens. Haiku 5.5 at $0.10 input and $0.50 output. Newer models may produce about 30% more tokens for the same text.

These are dated assumptions. Check them before relying on them.

## The audit's own assumptions (not sourced facts)

- 3 repair jobs per unit per year, or 0.25 a month.
- A job uses about 12 text segments (about $0.15) and about 15 Sonnet calls plus three quote documents (about $0.25), so about $0.40 variable cost per job.
- Background work (rent checks, forecast, notices) adds $0.05 per unit per month.
- Variable cost, rounded: $0.15 per unit per month.
- One text number per owner: $1.15 a month.
- Human support: $3 per owner per month (six minutes at $30 an hour).
- Churn: 3% a month, which means an average customer life of about 33 months.

Formula: monthly cost = units x $0.15 + $1.15 + $3. Lifetime value = contribution x 33.3 months. The most an owner can cost to win at a 3 to 1 ratio is lifetime value divided by 3.

## Modeled results

| Owner | Plan price | Revenue a month | Cost a month | Contribution a month | Lifetime value | Most to spend to win them (3 to 1) |
|---|---:|---:|---:|---:|---:|---:|
| 1 unit | $4 a unit | $4.00 | $4.30 | -$0.30 | Negative | None |
| 3 units | $6 a unit | $18.00 | $4.60 | $13.40 | about $447 | about $149 |
| 10 units | $8 a unit | $80.00 | $5.65 | $74.35 | about $2,478 | about $826 |

I re-did the arithmetic for this note and it matches the audit's figures (rounded).

## What the model says

1. **Human support is the big cost.** Six minutes costs $3, which is more than all the AI and texting cost, even at ten units.
2. **A one-unit owner loses money at $4 a unit.** The audit suggests a base fee of $10 to $15 a month per owner as one fix. For example, a $12 minimum would turn the one-unit case from -$0.30 into +$7.70 a month under these same assumptions. That is arithmetic, not a recommendation. The base-fee decision belongs to the owner of the business and is not made here.
3. **A three-unit owner supports only about $149 of acquisition cost.** Paid ads probably do not fit. Partnerships with inspectors, agents and ADU builders might.
4. **The result is sensitive.** The three assumptions that drive it are jobs per unit, support minutes and churn. If support doubles to $6, the one-unit case becomes -$3.30 a month and the three-unit contribution falls to $10.40 a month.
5. **The model leaves out:** payment processing, certified mail for rent notices, e-signature fees, photo storage, taxes, insurance, legal review, and the human work of coordinating vendors. Costs are understated until those are added.

## What to do next

- Keep the pricing page labeled as test prices. It stores a visitor's pick so the team can see which tier feels right, and that is all it measures.
- Decide on a base fee, or a one-unit price, before showing any customer a real price.
- Replace each assumption with a measurement after a pilot: jobs per unit, support minutes per owner, text segments and AI calls per job, churn.
- Add the missing cost lines to the model once real vendors, a real mail service and a real payment processor are chosen.
- Do not add a volume discount to the pricing page until the model above supports one (finding P08).
