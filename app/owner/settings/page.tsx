"use client";

import { ResetButton } from "@/components/ResetButton";
import { SwitchRow } from "@/components/Switch";
import { TextUpdatesToggle } from "@/components/TextUpdates";
import { PROPERTY } from "@/lib/seed";
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
  const { state, actions } = useDemo();

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <h1 className="text-3xl font-extrabold leading-tight sm:text-4xl">Settings</h1>

      <Section id="account" title="Your account">
        <dl className="grid grid-cols-[7rem_1fr] gap-y-1.5 text-sm">
          <dt className="font-bold text-ink-soft">Name</dt>
          <dd>{PROPERTY.owner}</dd>
          <dt className="font-bold text-ink-soft">Phone</dt>
          <dd>{PROPERTY.ownerPhone}</dd>
          <dt className="font-bold text-ink-soft">Property</dt>
          <dd>
            {PROPERTY.address} ({PROPERTY.units} unit)
          </dd>
          <dt className="font-bold text-ink-soft">Tenant</dt>
          <dd>{PROPERTY.tenant}</dd>
        </dl>
      </Section>

      <Section id="notifications" title="Notifications">
        <div className="divide-y divide-line">
          <TextUpdatesToggle party="owner" />
          <SwitchRow
            title="Call me for emergencies"
            description="A gas smell, flooding, or no heat rings your phone, even in Do Not Disturb."
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
        <p className="hint">These are saved settings. This sample does not place real calls or send real emails.</p>
      </Section>

      <Section id="approvals" title="What GoHome may do without asking">
        <ul className="space-y-2 text-sm">
          <li>
            <strong>Asks you first:</strong> booking a plumber, spending any money, and sending a message to a vendor for you.
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
