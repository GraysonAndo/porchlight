"use client";

import { DemoControls } from "@/components/DemoControls";
import { RentCard } from "@/components/RentCard";
import { TextUpdatesToggle } from "@/components/TextUpdates";
import { Thread } from "@/components/Thread";
import { useAgent } from "@/lib/agents/useAgent";
import { PROPERTY } from "@/lib/seed";

const STARTERS = [
  { label: "My water heater is leaking", text: "water heater is leaking all over the garage" },
  { label: "I smell gas", text: "I smell gas near the water heater" },
  { label: "The toilet is overflowing", text: "The toilet is clogged and overflowing" },
  { label: "How much is my rent?", text: "How much is my rent?" },
];

export default function TenantPage() {
  const agent = useAgent();
  const msgs = agent.msgsFor("tenant");
  const via = agent.textUpdates.tenant ? "text" : "app";

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <p className="eyebrow mb-1">Tenant view</p>
        <h1 className="font-display text-3xl font-extrabold leading-tight sm:text-4xl">How can we help?</h1>
        <p className="mt-2 text-lg text-ink-soft">
          Text Porchlight about a problem or a question. It takes care of the rest, and texts you every update. You never
          need to call anyone.
        </p>
      </div>

      <Thread
        party="tenant"
        msgs={msgs}
        typing={agent.typingFor("tenant")}
        placeholder="Tell Porchlight what is wrong"
        onSend={(text) => agent.send({ type: "tenant.text", text })}
        onPhoto={(photo) => agent.send({ type: "tenant.photo", photo })}
        photoLabels={[
          ["label", "Photo of the label"],
          ["leak", "Photo of the problem"],
          ["blurry", "Blurry photo (demo)"],
        ]}
        suggestions={msgs.length === 0 ? STARTERS : undefined}
        via={via}
        empty="Tap one of the buttons below, or type what is going on. A photo helps."
      />

      <TextUpdatesToggle party="tenant" />
      <RentCard audience="tenant" />

      <p className="text-sm text-ink-soft">
        {PROPERTY.owner} decides and pays for repairs. Porchlight keeps them updated, so you do not have to chase anyone.
      </p>

      <DemoControls show={["clock"]} />
    </div>
  );
}
