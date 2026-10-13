"use client";

import Link from "next/link";
import { StepShell } from "@/components/StepShell";
import { CheckIcon, ClockIcon } from "@/components/icons";
import { Badge, Callout, Card } from "@/components/ui";
import { ai } from "@/lib/ai";
import { useAsyncResult } from "@/lib/hooks";
import { PROPERTY, SEED_REQUEST, VENDORS } from "@/lib/seed";
import { useDemo } from "@/lib/store";

type StageState = "done" | "current" | "waiting";

interface Stage {
  title: string;
  detail: string;
  state: StageState;
}

export default function TenantStatusPage() {
  const { state, actions } = useDemo();
  const request = state.request ?? SEED_REQUEST;
  const approval = state.approval;
  const vendor = approval ? (VENDORS.find((v) => v.id === approval.vendorId) ?? VENDORS[0]) : null;
  const confirmed = state.tenantAccess === "confirmed";
  const needsChange = state.tenantAccess === "needs-change";
  const fixed = state.jobCompletedAt !== null;

  // The message the owner's booking sent to the tenant.
  const message = useAsyncResult(approval && vendor ? `${approval.vendorId}|${approval.accessWindow}` : null, () =>
    ai.draftTenantMessage({
      tenantName: PROPERTY.tenant,
      ownerName: PROPERTY.owner,
      vendorName: vendor?.name ?? "",
      address: PROPERTY.address,
      accessWindow: approval?.accessWindow ?? "",
    }),
  );

  const stages: Stage[] = [
    { title: "You reported the problem", detail: "We read your report and photo and sorted the urgency.", state: "done" },
    { title: "Owner notified", detail: `${PROPERTY.owner} was told right away.`, state: "done" },
    {
      title: "Owner choosing a plumber",
      detail: approval ? `${PROPERTY.owner} approved a plumber.` : `${PROPERTY.owner} is comparing quotes. This is the owner's decision.`,
      state: approval ? "done" : "current",
    },
    {
      title: "Plumber booked",
      detail: vendor && approval ? `${vendor.name}, ${approval.accessWindow}.` : "You will see the plumber and the time here.",
      state: approval ? "done" : "waiting",
    },
    {
      title: "You confirm the time",
      detail: confirmed
        ? "You confirmed the visit."
        : needsChange
          ? `You asked for a different time. ${PROPERTY.owner} will offer another one (simulated).`
          : "Please tell us if this time works.",
      state: confirmed ? "done" : approval ? "current" : "waiting",
    },
    {
      title: "Fixed",
      detail: fixed ? "The new water heater is installed. Thank you for your patience." : "We will mark this done after the visit.",
      state: fixed ? "done" : "waiting",
    },
  ];

  return (
    <StepShell stepId="tenant-status">
      <Card title="Your request">
        <p className="text-lg">{request.description}</p>
      </Card>

      <Card title="Where things stand">
        <ol>
          {stages.map((stage, i) => (
            <li key={stage.title} className="relative flex gap-4 pb-6 last:pb-0">
              {i < stages.length - 1 && (
                <span
                  aria-hidden="true"
                  className={`absolute left-[15px] top-8 h-full w-0.5 ${stage.state === "done" ? "bg-good" : "bg-line"}`}
                />
              )}
              <span
                aria-hidden="true"
                className={`z-10 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                  stage.state === "done"
                    ? "bg-good text-white"
                    : stage.state === "current"
                      ? "bg-glow text-ink ring-4 ring-glow/30"
                      : "bg-line text-ink-soft"
                }`}
              >
                {stage.state === "done" ? <CheckIcon size={18} /> : <ClockIcon size={18} />}
              </span>
              <div>
                <p className="flex flex-wrap items-center gap-2 text-lg font-extrabold">
                  {stage.title}
                  {stage.state === "current" && <Badge tone="info" icon={false}>Now</Badge>}
                </p>
                <p className="text-ink-soft">{stage.detail}</p>
              </div>
            </li>
          ))}
        </ol>
      </Card>

      {approval && vendor && (
        <Card title={`Message from ${PROPERTY.owner}`}>
          {message.data ? (
            <pre className="whitespace-pre-wrap rounded-xl border border-line bg-cream p-4 text-sm leading-relaxed">
              {message.data}
            </pre>
          ) : (
            <p className="text-ink-soft" role="status">
              Loading message...
            </p>
          )}
          {!confirmed && !needsChange && !fixed && (
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <button type="button" className="btn btn-primary" onClick={() => actions.confirmAccess("confirmed")}>
                That time works
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => actions.confirmAccess("needs-change")}>
                I need a different time
              </button>
            </div>
          )}
          {(confirmed || needsChange) && !fixed && (
            <div className="mt-4">
              <Callout tone={confirmed ? "good" : "caution"} title={confirmed ? "✓ Time confirmed" : "Different time requested"} role="status">
                <p>{confirmed ? `${PROPERTY.owner} and the plumber were told. (Simulated.)` : `${PROPERTY.owner} was asked to offer another time. (Simulated.)`}</p>
              </Callout>
            </div>
          )}
        </Card>
      )}

      {!approval && (
        <Callout tone="neutral" title="For the demo">
          <p>
            In real life the tenant waits here. To see what happens next, continue as the owner, who reviews this
            request and books a plumber.{" "}
            <Link href="/owner/request" className="font-bold underline underline-offset-4">
              Continue as the owner
            </Link>
          </p>
        </Callout>
      )}
    </StepShell>
  );
}
