"use client";

import { PhoneField } from "@/components/PhoneField";
import { ResetButton } from "@/components/ResetButton";
import { SwitchRow } from "@/components/Switch";
import { TextUpdatesToggle } from "@/components/TextUpdates";
import { useAgent } from "@/lib/agents/useAgent";
import { activityFor } from "@/lib/agents/views";
import { comingUp } from "@/lib/comingUp";
import { dueStatus } from "@/lib/payments";
import { PROPERTY } from "@/lib/seed";
import { weeklySummaryLines } from "@/lib/weeklySummary";
import { useDemo } from "@/lib/store";

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="card">
      <h2 id={id} className="mb-1 text-xl font-extrabold">
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function OwnerSettingsPage() {
  const { state, actions, hydrated } = useDemo();
  const agent = useAgent();
  const rentPaid = state.rentPaidAt !== null || state.payments.some((p) => p.kind === "rent");
  const waiting = agent.msgsFor("owner").filter((m) => m.dir === "out" && m.actions && !m.usedAction).length + (!rentPaid && dueStatus("rent").overdue ? 1 : 0);
  const summary = hydrated
    ? weeklySummaryLines({
        address: PROPERTY.address,
        activity: activityFor("owner", agent.visible),
        coming: comingUp({ utilitiesPaid: state.payments.some((p) => p.kind === "utilities") }),
        waitingOnOwner: waiting,
      })
    : [];

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <h1 className="text-3xl font-extrabold leading-tight sm:text-4xl">Settings</h1>

      <Section id="account" title="Your account">
        <dl className="grid grid-cols-[7rem_1fr] gap-y-1.5 text-sm">
          <dt className="font-bold text-ink-soft">Name</dt>
          <dd>{PROPERTY.owner}</dd>
          <dt className="font-bold text-ink-soft">Property</dt>
          <dd>
            {PROPERTY.address} ({PROPERTY.units} unit)
          </dd>
          <dt className="font-bold text-ink-soft">Tenant</dt>
          <dd>{PROPERTY.tenant}</dd>
        </dl>
        <div className="mt-3">
          <PhoneField party="owner" />
          <p className="hint">GoHome texts and calls this number. Fix it here if it is wrong.</p>
        </div>
      </Section>

      <Section id="notifications" title="Notifications">
        <div className="divide-y divide-line">
          <TextUpdatesToggle party="owner" />
          <SwitchRow
            title="Call me for emergencies"
            description="In the full product, a gas smell, flooding, or no heat will ring your phone, even in Do Not Disturb."
            on={state.prefs.ownerEmergencyCalls}
            onChange={(v) => actions.setPref("ownerEmergencyCalls", v)}
          />
          <SwitchRow
            title="Email me a weekly summary"
            description="What GoHome did, what you approved, and what is coming up."
            on={state.prefs.ownerEmail}
            onChange={(v) => actions.setPref("ownerEmail", v)}
          />
        </div>
        <details className="mt-3 rounded-xl bg-cream px-4">
          <summary className="flex min-h-11 cursor-pointer items-center font-bold">See what the weekly email would say</summary>
          <div className="space-y-1 pb-3 text-sm">
            {summary.map((line, i) => (
              <p key={i} className={i === 0 ? "font-extrabold" : ""}>
                {line}
              </p>
            ))}
            <p className="hint">Built from your activity log right now. This sample does not send real emails.</p>
          </div>
        </details>
        <p className="hint">These settings are saved on this device. This sample does not place real calls or send real emails.</p>
      </Section>

      <Section id="approvals" title="What GoHome may do without asking">
        <div className="mb-4 rounded-xl bg-cream p-4">
          <label htmlFor="auto-approve" className="label">
            Book repairs on its own when the quote is at or under
          </label>
          <div className="flex items-center gap-3">
            <input
              id="auto-approve"
              type="range"
              min={0}
              max={3000}
              step={50}
              value={state.prefs.ownerAutoApprove}
              onChange={(e) => actions.setPref("ownerAutoApprove", Number(e.target.value))}
              className="h-11 flex-1 accent-[var(--color-brand)]"
              aria-valuetext={state.prefs.ownerAutoApprove === 0 ? "Always ask me" : `Up to $${state.prefs.ownerAutoApprove}`}
            />
            <output htmlFor="auto-approve" className="w-28 shrink-0 text-right text-lg font-extrabold">
              {state.prefs.ownerAutoApprove === 0 ? "Always ask" : `$${state.prefs.ownerAutoApprove.toLocaleString("en-US")}`}
            </output>
          </div>
          <p className="hint">
            {state.prefs.ownerAutoApprove === 0
              ? "Every booking waits for your tap. Move the slider to let small repairs through."
              : `A repair quoted at ${`$${state.prefs.ownerAutoApprove.toLocaleString("en-US")}`} or less is booked for you, and you see it in the activity feed. Anything over that still waits for your tap. Emergencies always ring you.`}
          </p>
        </div>
        <div className="mb-4">
          <SwitchRow
            title="Remind late tenants for me"
            description="When rent is late past the grace period, GoHome texts your tenant what is owed and the late fee from your lease, once, and tells you after. Off means it waits for your tap."
            on={state.prefs.ownerAutoRemind}
            onChange={(v) => actions.setPref("ownerAutoRemind", v)}
          />
        </div>
        <ul className="space-y-2 text-sm">
          <li>
            <strong>Asks you first:</strong> booking a plumber over your limit above, spending any money beyond it, and sending a message to a vendor for you.
          </li>
          <li>
            <strong>Does on its own:</strong> asking vendors for quotes, checking each quote against typical prices, and texting your tenant safety steps and updates.
          </li>
          <li>
            <strong>Spending limit:</strong> every booking is capped at the quote plus 10%, so a plumber cannot go over without calling you.
          </li>
        </ul>
      </Section>

      <Section id="data" title="Your data">
        <p className="text-sm text-ink-soft">Everything in this sample is stored only in this browser. You can clear it any time.</p>
        <div className="mt-3">
          <ResetButton variant="secondary" />
        </div>
      </Section>
    </div>
  );
}
