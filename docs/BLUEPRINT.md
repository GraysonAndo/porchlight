# GoHome blueprint: an SMS-first autonomous property manager

GoHome lives in text messages. Nobody logs in. The web app shows the same conversation two ways: a simple chat with a "What GoHome is doing" panel for the tenant, and an approval inbox with the same panel for the owner. (An earlier build had a separate console at `/sms`. It was removed, and the main screens replaced it.)

## Rules that never change

1. The AI reads photos and documents and writes messages. It never sets a price, a threshold, a rule, or the legal rent cap. Plain code and hand-checked tables do that.
2. Anything that costs money, commits the owner, or goes to a third party waits for an owner tap (the Approval Gate). The only standing permission is asking vendors for quotes, which commits nothing.
3. Safety messages to a tenant never wait for approval, and they never include prices.
4. Emergencies (gas smell, smoke or sparks, flooding, water near electricity, no heat) skip fix steps, call the owner by voice so it rings through Do Not Disturb, and start no quotes until the home is clear.
5. Legal output is a draft, and a rent notice is mailed with proof of service, not texted.

## Architecture

```
 TENANT PHONE        LANDLORD PHONE                CONTRACTOR
 SMS / MMS photo     SMS + 1-tap card              email / SMS, PDF or photo quote
      |                    |                              |
      +--------------------+------------------------------+
                           v
   MESSAGING LAYER (Twilio-style): SMS/MMS, Voice, inbound email parse,
   signed webhooks, opt-in and STOP handling
                           | normalized events
                           v
   EVENT BUS + SCHEDULER: sms.in, photo.in, quote.in, approval.tapped,
   timers (quotes arrive, owner nudge, job done), cron (lease dates, CPI)
                           v
   ORCHESTRATOR: one state machine per case (a repair, a quote, a rent notice)
          +----------------+------------------+
          v                v                  v
   Agent 1: Triage   Agent 2: Quote     Agent 3: Sentinel
   and dispatch      audit              compliance and legal
          \                |                 /
           v               v                v
   TOOL LAYER
     AI (read and write only): read_photo, read_label, read_quote, draft_message
     PLAIN CODE (decides): emergency_rules, guide_library, price_benchmarks,
       decide_repair_replace, recommend_vendor, ab1482_calc, build_notice
     ACTIONS (gated): send_sms, call_owner, send_email, book_vendor, mail_notice
           |                                  ^
           v                                  |
   HOUSE RECORD (event-sourced DB)  <--->  APPROVAL GATE (one-tap token:
   equipment, leases, cases, quotes,        amount limit, expiry, who tapped)
   consents, audit trail
```

## Where it lives in this repo

| Piece | File |
| --- | --- |
| Event types, timeline entries, agent memory | `lib/agents/types.ts` |
| The three agents as one pure event reducer, timers, house record | `lib/agents/engine.ts` |
| Demo autopilot (reads agent state, picks the next human action) | `lib/agents/autopilot.ts` |
| Plain-code tools the agents call | `lib/triage.ts`, `lib/decision.ts`, `lib/quote.ts`, `lib/quoteParse.ts`, `lib/recommend.ts`, `lib/rent.ts`, `lib/forecast.ts`, `lib/safetyGuides.ts` |
| Screens | `app/tenant/page.tsx`, `app/owner/page.tsx`, `components/AgentPanel.tsx`, `components/Sms.tsx` |
| Tests | `tests/agents.test.ts` and the tests for each tool |

Every agent is `(world, event) => world`. That makes it deterministic, replayable, and easy to unit test. The screen replays the timeline at a human pace (typing indicators, delays), so it looks live while the logic stays plain.

## The three loops

**1. The 4 AM triage and dispatch agent.** Text in, emergency rules first, a safety question, steps from the hand-written guide library, the exact heater, age, and warranty read from the home record (everything is recorded at move-in, so there is no label photo step), a picture guide made for that model, vendor availability, quote requests, quotes checked, a decision card to the owner, one tap books.

**2. The quote audit and counter-negotiation agent.** A contractor emails a quote, the AI reads the line items, plain code checks each line against the price table, flags the labor rate and the markup, and drafts a pushback. The owner gets one message and a thumbs-up, edit, or skip. A counter is re-audited before the owner is asked again.

**3. The compliance and legal sentinel.** On a schedule it checks lease anniversaries, the 12-month lookback, and CPI. It computes the exact legal maximum (the lesser of 5% plus local CPI, or 10%, rounded down to the cent), picks the notice period (30 days, or 90 over 10%), drafts the notice, and waits for a tap. The tap mails the notice with tracking and saves proof of service.

## Real vs faked for the checkpoint

| Real | Faked, and labeled as faked |
| --- | --- |
| Emergency rules, quote math, AB 1482 math, recommendation, notice text | SMS and voice delivery (no Twilio yet) |
| Event reducer, timers, approval gate, house record writes | Photo and PDF reading (fixed samples, plus paste-a-quote on `/owner/quote`) |
| Interactive phone UI and autopilot | Vendor availability, vendor quotes, and the benchmark prices |

## To make it real

1. Twilio for SMS, MMS, and Voice, with opt-in consent, A2P 10DLC registration, and STOP and HELP handling.
2. Claude with vision behind the `AIProvider` interface for photos and PDFs (see the README).
3. A database with an event log for the house record and a signed one-tap approval link.
4. Real benchmark data for prices, a vendor network for availability, and a mail API for rent notices.
5. Attorney review of the AB 1482 logic, the notice, and local rules (for example San Jose), and professional review of every safety guide.
