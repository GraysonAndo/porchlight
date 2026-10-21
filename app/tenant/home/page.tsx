"use client";

import Link from "next/link";
import { Badge } from "@/components/ui";
import { guidesForEquipment, homeWideGuides } from "@/lib/homeGuides";
import { PROPERTY } from "@/lib/seed";
import { LEASE_ANNIVERSARY } from "@/lib/houseQa";
import { usd } from "@/lib/format";
import { BILLS, dueStatus, money } from "@/lib/payments";
import { useDemo } from "@/lib/store";
import { useEquipment } from "@/lib/useEquipment";

export default function TenantHomePage() {
  const { state } = useDemo();
  const equipment = useEquipment();
  const wide = homeWideGuides(equipment);
  const paidKinds = new Set(state.payments.map((p) => p.kind));
  if (state.rentPaidAt) paidKinds.add("rent");
  const dueCents = BILLS.filter((b) => !paidKinds.has(b.kind)).reduce((sum, b) => sum + b.cents, 0);
  const rentLate = !paidKinds.has("rent") && dueStatus("rent").overdue;

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold leading-tight sm:text-4xl">My home</h1>
        <p className="mt-1 text-lg text-ink-soft">{PROPERTY.address}</p>
      </div>

      <section aria-labelledby="things-heading" className="space-y-3">
        <div>
          <h2 id="things-heading" className="text-2xl font-extrabold">
            What is in your home
          </h2>
          <p className="text-ink-soft">GoHome keeps the brand, model, and place of everything, so help for your exact equipment is always one tap away.</p>
        </div>
        <ul className="grid gap-4 md:grid-cols-2">
          {equipment.map((item) => {
            const guides = guidesForEquipment(item.id, equipment);
            return (
              <li key={item.id} className="card flex flex-col gap-2">
                <div>
                  <p className="text-lg font-extrabold">{item.name}</p>
                  <p className="font-bold text-ink">
                    {item.brand}{" "}
                    <span>{item.model}</span>
                  </p>
                </div>
                <dl className="grid grid-cols-[6rem_1fr] gap-y-1 text-sm">
                  <dt className="font-bold text-ink-soft">Where</dt>
                  <dd>{item.location}</dd>
                  <dt className="font-bold text-ink-soft">What</dt>
                  <dd>{item.summary}</dd>
                  <dt className="font-bold text-ink-soft">Installed</dt>
                  <dd>{item.installYear}</dd>
                </dl>
                {guides.length > 0 ? (
                  <div className="mt-auto flex flex-col gap-2 pt-2">
                    {guides.map((g) => (
                      <Link key={g.id} href={`/tenant/guides/${g.id}`} className="btn btn-secondary !justify-between text-left text-sm">
                        <span>{g.title}</span>
                        <span aria-hidden="true">&rarr;</span>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="mt-auto pt-2 text-sm text-ink-soft">Nothing for you to do here. Tell GoHome if you notice a problem.</p>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="wide-heading" className="space-y-3">
        <h2 id="wide-heading" className="text-2xl font-extrabold">
          Quick fixes for the whole home
        </h2>
        <ul className="grid gap-3 md:grid-cols-2">
          {wide.map((g) => (
            <li key={g.id}>
              <Link href={`/tenant/guides/${g.id}`} className="card card-lift flex h-full flex-col gap-1">
                <span className="text-lg font-extrabold">{g.title}</span>
                <span className="text-sm text-ink-soft">{g.when}</span>
                <span className="mt-1 text-sm font-bold text-brand">
                  {g.steps.length} steps with pictures, about {g.time.replace("About ", "")}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="lease-heading" className="space-y-3">
        <h2 id="lease-heading" className="text-2xl font-extrabold">
          Your lease and rent
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="card space-y-2">
            <p className="font-extrabold">Lease basics</p>
            <dl className="grid grid-cols-[8rem_1fr] gap-y-1 text-sm">
              <dt className="font-bold text-ink-soft">Rent</dt>
              <dd>{usd(PROPERTY.rent)} per month</dd>
              <dt className="font-bold text-ink-soft">Next lease anniversary</dt>
              <dd>{LEASE_ANNIVERSARY}</dd>
              <dt className="font-bold text-ink-soft">Your owner</dt>
              <dd>{PROPERTY.owner}</dd>
              <dt className="font-bold text-ink-soft">Tenant since</dt>
              <dd>{PROPERTY.tenantSince}</dd>
            </dl>
            <Badge tone="info" icon={false}>
              Ask GoHome in the chat if you have questions about your lease
            </Badge>
          </div>
          <div className="card flex flex-col gap-2">
            <p className="font-extrabold">Rent and utilities</p>
            <p className="text-3xl font-extrabold">{money(dueCents)}</p>
            <p className={`text-sm ${rentLate ? "font-bold text-urgent" : "text-ink-soft"}`}>
              {dueCents === 0 ? "You are all paid up." : rentLate ? `Rent is ${dueStatus("rent").text}` : "due this month"}
            </p>
            <Link href="/tenant/pay" className="btn btn-primary mt-auto">
              {dueCents > 0 ? "Pay now" : "See payments"}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
