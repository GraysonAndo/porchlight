"use client";

// "Live preview": a small card that says what the other person is seeing right now, and offers one tap to act as them.
// One person can only look at one side at a time, so this keeps the story moving without a second browser window.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { flowPromptFor } from "@/lib/agents/prompts";
import { useAgent } from "@/lib/agents/useAgent";
import { roleForPath } from "@/lib/steps";

const SHOWN_ON = new Set(["/tenant", "/tenant/home", "/owner"]);

export function FlowPrompt() {
  const pathname = usePathname();
  const agent = useAgent();
  const [dismissed, setDismissed] = useState<string | null>(null);
  const role = roleForPath(pathname);

  if (!role || !SHOWN_ON.has(pathname)) return null;
  // Wait until GoHome has finished typing, so the card never spoils a message that has not appeared yet.
  if (agent.pending) return null;
  const prompt = flowPromptFor(role, agent.world);
  if (!prompt || dismissed === prompt.key) return null;

  const otherSide = role === "tenant" ? "owner" : "tenant";
  return (
    <aside
      aria-label={`Live preview of the ${otherSide}'s side`}
      className="reveal mb-5 flex flex-col gap-3 rounded-2xl border border-brand bg-white p-4 md:flex-row md:items-center"
    >
      <div className="min-w-0 flex-1">
        <p className="mb-1 inline-block rounded-full bg-brand-tint px-2.5 py-0.5 text-xs font-extrabold uppercase tracking-wide text-brand">Live preview</p>
        <p className="font-extrabold leading-snug">{prompt.title}</p>
        {prompt.preview && (
          <blockquote className="mt-2 rounded-xl bg-cream p-3 text-sm">
            <span className="block text-xs font-extrabold uppercase tracking-wide text-ink-soft">{prompt.preview.who}</span>
            <span className="mt-0.5 line-clamp-3 block">{prompt.preview.text}</span>
          </blockquote>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2 md:flex-col md:items-stretch">
        {prompt.cta &&
          ("href" in prompt.cta ? (
            <Link href={prompt.cta.href} className="btn btn-primary flex-1 text-sm md:w-64">
              {prompt.cta.label}
            </Link>
          ) : (
            <button
              type="button"
              className="btn btn-primary flex-1 text-sm md:w-64"
              onClick={() => {
                const events = prompt.cta && "events" in prompt.cta ? prompt.cta.events : [];
                events.forEach((ev) => agent.send(ev));
              }}
            >
              {prompt.cta.label}
            </button>
          ))}
        <button type="button" aria-label="Hide this preview" onClick={() => setDismissed(prompt.key)} className="btn btn-ghost !min-h-11 !px-3 text-sm no-underline">
          Hide
        </button>
      </div>
    </aside>
  );
}
