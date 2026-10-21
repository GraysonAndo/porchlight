# California legal and licensing review checklist

**This is not legal advice, and nobody qualified has reviewed it.** It records what the original audit found, what the prototype does about it, and what still has to be checked by a California real estate attorney (or a CPA for tax items). The audit used official city pages and an industry guide. It did not read every statute itself. Nothing below is a compliance claim, and no page in the prototype should say "compliant" or show a compliance badge.

How to read the columns: **Source** is where the audit got the point. **Jurisdiction** says how far it applies. **Date** is when the audit recorded it (October 21, 2026), not a date anyone has re-checked. **Uncertainty** is how sure we are. **Verification** is what has happened since. Every row below is "Not verified by a professional" unless it says otherwise, and none says otherwise.

## 1. Rent cap (AB 1482, Civil Code section 1947.12)

| Point | Source | Jurisdiction | Uncertainty | What the prototype does | Verification |
|---|---|---|---|---|---|
| The yearly cap is 5% plus local inflation, never more than 10%, and the lower number applies | The audit; also cited in `lib/rent.ts` | California, statewide | Medium. The audit did not read the statute | `calculateRent` in `lib/rent.ts` applies it, with unit tests | Not verified by a professional |
| Alameda's published inflation figure for August 2025 to July 2026 is 1.3%, so the cap would be 6.3% | An official city page, per the audit | Alameda, one period | High. One city, one period, not re-checked | The prototype uses a 3.0% sample figure (8.0% cap, $3,456 on $3,200). If the real local figure is lower, the sample maximum is too high | Not verified. The real figure for the owner's area is unknown |
| A dollar maximum must not look final when the inflation figure is a guess | Audit finding | n/a | Low | The rent page and the Monday lease check now say the maximum needs the owner's confirmed inflation figure. No Recommended or Max legal number is shown as final until the owner ticks "I checked this inflation figure for my area" | Behavior tested by `tests/rent.test.ts`, `tests/agents.test.ts`, `scripts/e2e.mjs`. The legal rule itself is unverified |
| A single-family home owned by an individual may be exempt only if the tenant got the written exemption notice AND the lease has the exemption wording | The audit | California | Medium to high. Wording, timing and who qualifies need an attorney | Exemption now needs both the notice and the lease wording. The draft exemption notice says to check the lease wording and timing with an attorney | Behavior tested. Not verified by a professional |
| Local rules (for example San Jose) can be stricter than state law | The audit | Local | High | Letters and cards say "Draft, not legal advice. Local rules can be stricter" | Not researched |

## 2. Entry and repairs (Civil Code section 1954)

| Point | Source | Uncertainty | What the prototype does | Verification |
|---|---|---|---|---|
| Written notice should state date, approximate time and purpose. 24 hours is presumed reasonable. Entry is generally during normal business hours except in an emergency | The audit | Medium | The prototype books a visit time in chat. It does not generate an entry notice (roadmap idea 26) | Not verified |
| An oral agreement for a visit within one week may count, which might apply when a tenant taps a time in chat | The audit, flagged "confirm with counsel" | High | The prototype does not assert that a chat tap satisfies the law | Needs an attorney before any claim is made |

## 3. Security deposits and AB 2801

| Point | Source | Uncertainty | Verification |
|---|---|---|---|
| A general one-month-rent cap from July 1, 2024 | A San Francisco Rent Board source, per the audit | Medium | Not verified |
| A two-month allowance for some small landlords (individuals or all-individual LLCs, no more than two properties and four total units) | Same | High. The qualifying test is narrow | Not verified |
| Return the deposit within 21 days of move-out | Same | Medium | Not verified |
| AB 2801 photo rules: photos for cleaning or repair charges starting April 1, 2025, and move-in photos for tenancies starting July 1, 2025 or later | Same | Medium | Not verified |

The prototype has no deposit feature (roadmap ideas 27 and 28). Treat this section as a checklist to verify before building one, not as a design.

## 4. Broker license risk by feature

| Feature | Audit's risk | Reason | Prototype position |
|---|---|---|---|
| Owner-approved repair booking | Medium | Arranging work for an owner may count as managing property for others. Uncertain | The owner taps Approve every time. Limits are the owner's own setting |
| Rent notice drafts and sending | Medium | Owner approval helps, but negotiating lease terms may need a license | Pricing and cards say "notice drafts, ready for you to send". The owner sends |
| Collecting and moving rent | High | Holding or paying out trust funds may require a broker | The pay screen is a sample and nothing is charged. A real version should never hold rent. Use a processor that pays owners directly |
| Listings and leasing | High | Advertising rentals for several owners for pay may require a license | Not built (roadmap 49, 50) |
| Software only, owner acts and holds the money | Lower | | This is the intended posture |

Risk reducers from the audit: the owner taps every action, GoHome never holds rent, a processor pays owners directly, and GoHome describes itself as software that helps owners, not a property management service. **A California real estate attorney must review before any of this is stated as a legal position.**

## 5. Other areas the audit did not research

| Area | Status |
|---|---|
| Liability when an AI gives wrong safety instructions | Not researched. The prototype uses hand-written safe steps and shows no AI output as a safety instruction. No plumber or attorney has reviewed them |
| California privacy law for photos taken inside homes | Not researched (roadmap idea 63) |
| Just-cause eviction rules | Not researched (roadmap idea 31) |
| Local rules such as San Jose's | Not researched |
| Bay Area gas-appliance rules: the audit says zero-NOx requirements apply to new water heaters from January 1, 2027 and furnaces from January 1, 2029 (BAAQMD and NBI), and that this does not force removal of existing appliances | Not verified. Check the official district rules and what applies to the owner's city before saying anything on the site (roadmap idea 24) |
| Smoke and CO detectors, water heater seismic strapping, heat and hot water duties | The record reminds owners about smoke and CO tests. Strapping rules are not verified |
| Lead paint disclosure for homes built before 1978, and other California disclosures | Not verified (roadmap idea 29) |
| Permits for water heater and HVAC replacement | The audit says they usually need permits. City rules are not verified, and the prototype only shows a typical permit amount in a quote |
| Habitability response clocks for heat, water and safety | Not built (roadmap idea 32) |
| A downloadable repair record with timestamps | The log has timestamps. No download yet (roadmap idea 33) |

## 6. Tax items (roadmap idea 21)

The audit mentions 27.5-year depreciation for residential rental improvements and a $2,500 small-item safe harbor from the IRS. These are unverified. Do not put any tax treatment in the product until a CPA has reviewed each rule.

## What has to happen before any of this goes live

1. A California real estate attorney reviews the rent notice drafts, the exemption wording, the entry notice plan, the deposit plan, and the broker license position.
2. A licensed plumber reads every safe-step guide and the emergency copy.
3. Someone looks up the real local inflation figure and the real city rules for each pilot owner.
4. The site keeps saying "Draft, not legal advice" until the first three are done and written down. Do not add a "compliant" badge.
