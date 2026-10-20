"use client";

import { ResetButton } from "@/components/ResetButton";
import Link from "next/link";
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

export default function TenantSettingsPage() {
  const { state, actions } = useDemo();
  const method = state.payments.at(-1);
  const saved = method ? `${method.method === "card" ? "card" : "bank account"} ending in ${method.last4}` : null;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <h1 className="text-3xl font-extrabold leading-tight sm:text-4xl">Settings</h1>

      <Section id="account" title="Your account">
        <dl className="grid grid-cols-[7rem_1fr] gap-y-1.5 text-sm">
          <dt className="font-bold text-ink-soft">Name</dt>
          <dd>{PROPERTY.tenant}</dd>
          <dt className="font-bold text-ink-soft">Phone</dt>
          <dd>{PROPERTY.tenantPhone}</dd>
          <dt className="font-bold text-ink-soft">Email</dt>
          <dd>{PROPERTY.tenantEmail}</dd>
          <dt className="font-bold text-ink-soft">Home</dt>
          <dd>{PROPERTY.address}</dd>
          <dt className="font-bold text-ink-soft">Owner</dt>
          <dd>{PROPERTY.owner}</dd>
        </dl>
      </Section>

      <Section id="notifications" title="Notifications">
        <div className="divide-y divide-line">
          <TextUpdatesToggle party="tenant" />
          <SwitchRow
            title="Email receipts and updates"
            description={`Receipts and a summary of each repair go to ${PROPERTY.tenantEmail}.`}
            on={state.prefs.tenantEmail}
            onChange={(v) => actions.setPref("tenantEmail", v)}
          />
        </div>
        <p className="hint">Emergency safety messages are always sent, even if you turn these off.</p>
        <p className="mt-2">
          <Link href="/tenant/texts" className="font-bold text-brand underline underline-offset-4">
            See how GoHome will feel by text
          </Link>
        </p>
      </Section>

      <Section id="payments" title="Payments">
        <SwitchRow
          title="Autopay"
          description={saved ? `Pays rent on the 1st with your ${saved}.` : "Make a payment first, and your payment method is saved for autopay."}
          on={state.prefs.tenantAutopay && Boolean(saved)}
          onChange={(v) => actions.setPref("tenantAutopay", v)}
          disabled={!saved}
        />
        <p className="hint">Card numbers are never saved here, only the last four digits. All payments are sample data.</p>
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
