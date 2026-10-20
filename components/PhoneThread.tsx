"use client";

// A phone showing how GoHome will feel by text message. It runs its own copy of the agent, so it never touches the real conversation,
// and nothing here is really sent. The tenant texts a problem and gets the safe steps and each update as text messages.

import { useCallback, useEffect, useRef, useState } from "react";
import { LogoMark } from "./Logo";
import { PauseIcon, PlayIcon, RestartIcon } from "./icons";
import { advanceTo, clockText, createWorld, nextTimerAt, openOwnerMessage, send, shownFor } from "@/lib/agents/engine";
import type { Ev, Msg, World } from "@/lib/agents/types";

const STARTERS = [
  { label: "My water heater is leaking", text: "water heater is leaking all over the garage" },
  { label: "I smell gas", text: "I smell gas near the water heater" },
];

/** What the tenant would type, in order, with the owner and the plumber's side done quietly in between. */
const SCRIPT: ("leak" | "no" | "done" | "quotes" | "approve" | "works" | "finish")[] = ["leak", "no", "done", "quotes", "approve", "works", "finish"];

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

function tenantMsgs(w: World): Msg[] {
  return w.timeline.filter((e): e is Msg => e.kind === "msg" && e.party === "tenant");
}

export function PhoneThread() {
  const [world, setWorld] = useState<World>(() => createWorld());
  const [shown, setShown] = useState(0);
  const [draft, setDraft] = useState("");
  const [playing, setPlaying] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const stop = useRef(false);
  const paused = useRef(false);
  const [isPaused, setIsPaused] = useState(false);
  const [fast, setFast] = useState(false);
  const fastRef = useRef(false);

  const all = tenantMsgs(world);
  const visible = all.slice(0, shown);
  const nextMsg = all[shown];
  // GoHome's next reply shows "typing" first. The tenant's own texts appear at once.
  const typing = nextMsg !== undefined && nextMsg.dir === "out";

  useEffect(() => {
    if (!nextMsg) return;
    const t = setTimeout(() => setShown((n) => n + 1), nextMsg.dir === "in" ? 0 : 900 + Math.min(nextMsg.text.length * 6, 800));
    return () => clearTimeout(t);
  }, [nextMsg]);

  useEffect(() => {
    box.current?.scrollTo({ top: box.current.scrollHeight, behavior: "smooth" });
  }, [shown, typing]);

  const act = useCallback((ev: Ev) => setWorld((w) => send(w, ev)), []);
  const lastOut = [...visible].reverse().find((m) => m.dir === "out");
  const chips = !typing && lastOut && lastOut === visible[visible.length - 1] ? (lastOut.actions ?? []) : [];

  function reset() {
    stop.current = true;
    paused.current = false;
    setIsPaused(false);
    setWorld(createWorld());
    setShown(0);
    setPlaying(false);
    setDraft("");
  }

  async function play() {
    reset();
    await wait(50);
    stop.current = false;
    paused.current = false;
    setIsPaused(false);
    setPlaying(true);
    let w = createWorld();
    const push = (ev: Ev) => {
      w = send(w, ev);
      setWorld(w);
    };
    for (const step of SCRIPT) {
      if (stop.current) return;
      await wait((step === "leak" ? 600 : 2600) / (fastRef.current ? 2.5 : 1));
      while (paused.current && !stop.current) await wait(150);
      if (stop.current) return;
      if (step === "leak") push({ type: "tenant.text", text: STARTERS[0].text, shown: STARTERS[0].label });
      else if (step === "no") push({ type: "tenant.text", text: "2", shown: "No" });
      else if (step === "done") push({ type: "tenant.text", text: "done", shown: "Done" });
      else if (step === "quotes") {
        const at = nextTimerAt(w);
        if (at !== null) {
          w = advanceTo(w, at);
          setWorld(w);
        }
      } else if (step === "approve") {
        const open = openOwnerMessage(w);
        if (open) push({ type: "owner.tap", msgId: open.id, action: "approve" });
      } else if (step === "works") push({ type: "tenant.text", text: "1", shown: "That works" });
      else if (step === "finish") push({ type: "owner.markDone" });
    }
    setPlaying(false);
  }

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[1fr_auto]">
      <div className="space-y-4">
        <p className="rounded-xl bg-glow-tint p-3 font-bold">
          In the full product, GoHome works over text message. This phone shows how it will look. Nothing here is really sent.
        </p>
        <ol className="list-decimal space-y-2 pl-6 text-lg">
          <li>You text a problem, the way you would text a friend.</li>
          <li>For a leak, GoHome asks one safety question, then sends two safe steps and a link to a picture guide made for your exact equipment. For a gas smell, it asks nothing: it tells you to leave and call for help.</li>
          <li>It texts you the plumber&apos;s name and time, and again when it is fixed. You never log in or call anyone.</li>
        </ol>
        <div className="flex flex-wrap gap-3">
          {playing ? (
            <>
              <button
                type="button"
                className="btn btn-primary"
                aria-pressed={isPaused}
                onClick={() => {
                  paused.current = !paused.current;
                  setIsPaused(paused.current);
                }}
              >
                {isPaused ? <PlayIcon size={20} /> : <PauseIcon size={20} />} {isPaused ? "Resume" : "Pause"}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                aria-pressed={fast}
                onClick={() => {
                  fastRef.current = !fastRef.current;
                  setFast(fastRef.current);
                }}
              >
                {fast ? "Normal speed" : "Faster"}
              </button>
            </>
          ) : (
            <button type="button" className="btn btn-primary" onClick={play}>
              <PlayIcon size={20} /> Play the whole story
            </button>
          )}
          <button type="button" className="btn btn-secondary" onClick={reset}>
            <RestartIcon size={20} /> Start over
          </button>
        </div>
        <p className="text-sm text-ink-soft">The story is a slideshow of one sample repair. Or play it yourself: tap a message, or type to GoHome on the phone.</p>
      </div>

      <section aria-label="A phone showing a text conversation with GoHome" className="mx-auto w-[320px] max-w-full rounded-[2.6rem] border-[10px] border-ink bg-ink shadow-xl">
        <div className="overflow-hidden rounded-[1.9rem] bg-white">
          <div className="flex items-center justify-between bg-white px-5 pb-1 pt-3 text-xs font-extrabold" aria-hidden="true">
            <span>{clockText(visible[visible.length - 1]?.at ?? 247)}</span>
            <span className="h-5 w-24 rounded-full bg-ink" />
            <span>5G</span>
          </div>
          <div className="flex items-center gap-2 border-b border-line px-4 py-2">
            <LogoMark size={32} />
            <div className="leading-tight">
              <p className="font-extrabold">GoHome</p>
              <p className="text-xs text-ink-soft">Text message</p>
            </div>
          </div>
          <div ref={box} className="h-[26rem] space-y-2 overflow-y-auto bg-cream p-3" role="log" aria-live="polite" aria-label="Text messages">
            {visible.length === 0 && !typing && <p className="mt-24 px-4 text-center text-sm font-bold text-ink-soft">Text GoHome like you would text a friend. Tap a message below to start.</p>}
            {visible.map((m) => (
              <div key={m.id} className={`flex ${m.dir === "in" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${m.dir === "in" ? "rounded-br-sm bg-brand text-white" : "rounded-bl-sm bg-white shadow-sm"}`}>
                  <p className="whitespace-pre-line">{m.text}</p>
                  {m.guide && <p className="mt-1.5 rounded-lg bg-brand-tint px-2 py-1 text-xs font-extrabold text-brand">Show me how: picture guide for your heater</p>}
                  <p className={`mt-1 text-right text-[11px] font-bold ${m.dir === "in" ? "text-white/80" : "text-ink-soft"}`}>{clockText(m.at)}</p>
                </div>
              </div>
            ))}
            {typing && (
              <div className="flex" role="status" aria-label="GoHome is typing">
                <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm bg-white px-4 py-3 text-ink-soft shadow-sm">
                  <span className="typing-dot" />
                  <span className="typing-dot" style={{ animationDelay: "0.18s" }} />
                  <span className="typing-dot" style={{ animationDelay: "0.36s" }} />
                </div>
              </div>
            )}
          </div>
          <div className="space-y-2 border-t border-line bg-white p-2">
            {(chips.length > 0 || visible.length === 0) && (
              <div className="flex flex-wrap gap-1.5" role="group" aria-label="Quick replies">
                {(visible.length === 0 ? STARTERS.map((s) => ({ id: s.label, label: s.label, text: s.text })) : chips.map((c) => ({ id: c.id, label: c.label, text: c.text ?? c.label }))).map((c) => (
                  <button key={c.id} type="button" className="btn btn-secondary !min-h-11 !px-3 text-left text-xs" disabled={playing} onClick={() => act({ type: "tenant.text", text: c.text, shown: shownFor(c.label) })}>
                    {c.label}
                  </button>
                ))}
              </div>
            )}
            <form
              className="flex items-center gap-1.5"
              onSubmit={(e) => {
                e.preventDefault();
                const text = draft.trim();
                if (!text) return;
                act({ type: "tenant.text", text });
                setDraft("");
              }}
            >
              <label htmlFor="phone-msg" className="sr-only">
                Text GoHome
              </label>
              <input id="phone-msg" className="field !min-h-11 min-w-0 flex-1 !rounded-full !px-4 text-sm" placeholder="Text GoHome" value={draft} maxLength={500} autoComplete="off" disabled={playing} onChange={(e) => setDraft(e.target.value)} />
              <button type="submit" className="btn btn-primary !min-h-11 !px-4 text-sm" disabled={!draft.trim() || playing}>
                Send
              </button>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}
