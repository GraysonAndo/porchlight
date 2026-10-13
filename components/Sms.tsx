"use client";

// The pieces of the SMS console: a phone with a message thread and a message box,
// the agent tool log, the house record that updates as the agents write to it,
// and the contractor's inbox. They all draw from one timeline of entries.

import { useEffect, useRef, useState, type ReactNode } from "react";
import { AgentFeed } from "./Agent";
import { LogoMark } from "./Logo";
import { PhoneFrame } from "./Phones";
import { CameraIcon, CheckIcon, MoonIcon, PhoneCallIcon, TapIcon } from "./icons";
import { Badge } from "./ui";
import { RECORD_FIELDS, clockText, type RecordView } from "@/lib/agents/engine";
import type { Entry, Msg, MsgAction, Party, PhotoKind, ToolCall } from "@/lib/agents/types";
import type { AgentEvent } from "@/lib/scenario";

const PHOTO_SRC: Record<PhotoKind, string> = {
  leak: "/sample/leaking-heater.svg",
  label: "/sample/equipment-label.svg",
  blurry: "/sample/equipment-label-blurry.svg",
};

const PHOTO_ALT: Record<PhotoKind, string> = {
  leak: "Photo sent by the tenant: a water heater leaking at the base, with a puddle on the garage floor",
  label: "Photo sent by the tenant: the sticker on the water heater, in focus",
  blurry: "Photo sent by the tenant: the sticker on the water heater, too blurry to read",
};

function Typing() {
  return (
    <div className="flex items-end gap-2" role="status" aria-label="Porchlight is typing">
      <span className="shrink-0">
        <LogoMark size={26} />
      </span>
      <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm border border-line bg-white px-4 py-3 text-ink-soft shadow-sm">
        <span className="typing-dot" />
        <span className="typing-dot" style={{ animationDelay: "0.18s" }} />
        <span className="typing-dot" style={{ animationDelay: "0.36s" }} />
      </div>
    </div>
  );
}

function Attachment({ title, body }: { title: string; body: string }) {
  return (
    <details className="mt-2 rounded-xl border border-line bg-cream text-xs">
      <summary className="flex min-h-11 cursor-pointer items-center gap-1.5 px-2 font-extrabold">
        <span aria-hidden="true">📎</span> {title}
      </summary>
      <pre className="max-h-48 overflow-auto whitespace-pre-wrap border-t border-line p-2 font-sans leading-snug">{body}</pre>
    </details>
  );
}

function Bubble({ msg, perspective }: { msg: Msg; perspective: Party }) {
  const mine = msg.dir === "in" && msg.party === perspective;

  if (msg.channel === "call") {
    return (
      <div className="reveal rounded-2xl border-2 border-urgent bg-urgent-tint p-3 text-sm">
        <p className="flex items-center gap-2 font-extrabold text-urgent">
          <PhoneCallIcon size={20} /> Incoming call from Porchlight
        </p>
        <p className="mt-1">{msg.text}</p>
        <p className="mt-1 text-xs font-bold opacity-70">Rings through Do Not Disturb</p>
        <p className="mt-1 text-right text-[11px] font-bold opacity-60">{clockText(msg.at)}</p>
      </div>
    );
  }

  return (
    <div className={`reveal flex ${mine ? "justify-end" : "justify-start gap-2"}`}>
      {!mine && (
        <span className="mt-1 shrink-0">
          <LogoMark size={26} />
        </span>
      )}
      <div
        className={`max-w-[88%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
          mine ? "rounded-br-sm bg-glow text-ink" : "rounded-bl-sm border border-line bg-white"
        }`}
      >
        {msg.photo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={PHOTO_SRC[msg.photo]} alt={PHOTO_ALT[msg.photo]} className="mb-1 w-44 rounded-lg border border-ink/20" />
        )}
        {msg.text && <p className="whitespace-pre-line">{msg.text}</p>}
        {msg.attachment && <Attachment title={msg.attachment.title} body={msg.attachment.body} />}
        <p className="mt-1 flex items-center justify-end gap-1.5 text-[11px] font-bold opacity-60">
          {msg.silent && (
            <span className="inline-flex items-center gap-1">
              <MoonIcon size={12} /> Delivered silently
            </span>
          )}
          {mine && <span>Delivered</span>}
          <span>{clockText(msg.at)}</span>
        </p>
      </div>
    </div>
  );
}

function OwnerButtons({ msg, onTap }: { msg: Msg; onTap: (msgId: string, action: string) => void }) {
  if (!msg.actions) return null;
  return (
    <div className="reveal -mt-1 flex flex-wrap gap-2 pl-8" role="group" aria-label="Quick replies">
      {msg.actions.map((a: MsgAction, i) => {
        const used = msg.usedAction === a.id;
        return (
          <button
            key={a.id}
            type="button"
            disabled={msg.usedAction !== undefined}
            onClick={() => onTap(msg.id, a.id)}
            className={`btn !min-h-11 !px-3 text-sm ${i === 0 && !msg.usedAction ? "btn-primary" : "btn-secondary"} ${
              used ? "!border-good !bg-good-tint !text-good-ink" : ""
            }`}
          >
            {used && <CheckIcon size={16} />} {a.label}
          </button>
        );
      })}
    </div>
  );
}

interface SmsPhoneProps {
  party: "tenant" | "owner";
  title: string;
  label: string;
  msgs: Msg[];
  typing: boolean;
  clock: string;
  quiet?: boolean;
  placeholder: string;
  onSend: (text: string) => void;
  onTap?: (msgId: string, action: string) => void;
  onPhoto?: (kind: PhotoKind) => void;
  suggestions?: { label: string; text: string }[];
}

export function SmsPhone({ party, title, label, msgs, typing, clock, quiet, placeholder, onSend, onTap, onPhoto, suggestions }: SmsPhoneProps) {
  const [draft, setDraft] = useState("");
  const [menu, setMenu] = useState(false);
  const last = msgs[msgs.length - 1];
  // Tenant quick replies live under the latest message from Porchlight, until the tenant answers.
  const chips = party === "tenant" && last && last.dir === "out" && last.actions ? last.actions : [];

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    onSend(text);
    setDraft("");
  }

  const footer = (
    <div className="border-t border-line bg-white/80 p-2">
      {(chips.length > 0 || (suggestions && suggestions.length > 0)) && (
        <div className="mb-2 flex flex-wrap gap-1.5" role="group" aria-label="Quick replies">
          {chips.map((c) => (
            <button key={c.id} type="button" className="btn btn-secondary !min-h-11 !px-3 text-sm" onClick={() => onSend(c.text ?? c.label)}>
              {c.label}
            </button>
          ))}
          {(suggestions ?? []).map((s) => (
            <button key={s.label} type="button" className="btn btn-secondary !min-h-11 !px-3 text-left text-sm" onClick={() => onSend(s.text)}>
              {s.label}
            </button>
          ))}
        </div>
      )}
      {menu && onPhoto && (
        <div className="mb-2 flex flex-wrap gap-1.5" role="group" aria-label="Choose a photo to send">
          {(
            [
              ["label", "Label photo"],
              ["blurry", "Blurry photo"],
              ["leak", "Photo of the leak"],
            ] as const
          ).map(([kind, text]) => (
            <button
              key={kind}
              type="button"
              className="btn btn-secondary !min-h-11 !px-3 text-sm"
              onClick={() => {
                onPhoto(kind);
                setMenu(false);
              }}
            >
              {text}
            </button>
          ))}
        </div>
      )}
      <form onSubmit={submit} className="flex items-center gap-1.5">
        {onPhoto && (
          <button type="button" className="btn btn-secondary !min-h-11 !px-3" aria-label="Send a photo" aria-expanded={menu} onClick={() => setMenu((m) => !m)}>
            <CameraIcon size={20} />
          </button>
        )}
        <label htmlFor={`${party}-msg`} className="sr-only">
          {placeholder}
        </label>
        <input
          id={`${party}-msg`}
          className="field !min-h-11 min-w-0 flex-1 !rounded-full !px-4 text-sm"
          placeholder={placeholder}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          autoComplete="off"
        />
        <button type="submit" className="btn btn-primary !min-h-11 !px-4 text-sm" disabled={!draft.trim()}>
          Send
        </button>
      </form>
    </div>
  );

  return (
    <PhoneFrame title={title} clock={clock} statusNote={quiet ? "DND on" : "5G"} scrollKey={msgs.length * 2 + (typing ? 1 : 0)} label={label} footer={footer}>
      <div role="log" aria-live="polite" aria-label={`${title} messages`} className="space-y-3">
        {msgs.length === 0 && !typing && (
          <p className="mt-20 text-center text-sm font-bold text-ink-soft">
            {party === "tenant" ? "Text Porchlight like you would at 4 AM. Try a suggestion below." : "No messages yet. Porchlight only texts when it needs you."}
          </p>
        )}
        {msgs.map((m) => (
          <div key={m.id} className="space-y-2">
            <Bubble msg={m} perspective={party} />
            {party === "owner" && onTap && m.dir === "out" && <OwnerButtons msg={m} onTap={onTap} />}
          </div>
        ))}
        {typing && <Typing />}
      </div>
    </PhoneFrame>
  );
}

// ---------------------------------------------------------------------------
// The agent tool log
// ---------------------------------------------------------------------------

const AGENT_LABEL: Record<ToolCall["agent"], string> = {
  triage: "Triage and dispatch",
  quote: "Quote audit",
  sentinel: "Compliance sentinel",
  gate: "Approval gate",
};

export function ToolLog({ entries }: { entries: Entry[] }) {
  const box = useRef<HTMLDivElement>(null);
  const events: AgentEvent[] = [];
  for (const e of entries) {
    if (e.kind === "tool") {
      events.push({ id: e.id, clock: clockText(e.at), tool: e.tool, engine: e.engine, title: e.title, detail: `${AGENT_LABEL[e.agent]}. ${e.detail}` });
    } else if (e.kind === "record" && e.history) {
      events.push({ id: e.id, clock: clockText(e.at), tool: "write_house_record", engine: "code", title: "Wrote to the house record", detail: e.history });
    }
  }

  useEffect(() => {
    const el = box.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [events.length]);

  return (
    <div ref={box} className="h-[420px] overflow-y-auto pr-1" tabIndex={0} aria-label="Agent tool log, scrollable">
      <AgentFeed events={events} live />
    </div>
  );
}

// ---------------------------------------------------------------------------
// The house record
// ---------------------------------------------------------------------------

export function RecordPanel({ view }: { view: RecordView }) {
  const groups = Array.from(new Set(RECORD_FIELDS.map((f) => f.group)));
  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <section key={group} aria-label={group}>
          <h3 className="text-sm font-extrabold uppercase tracking-wide text-ink-soft">{group}</h3>
          <dl className="mt-1 divide-y divide-line rounded-xl border border-line bg-white">
            {RECORD_FIELDS.filter((f) => f.group === group).map((f) => {
              const value = view.values[f.key];
              const changed = view.changed.includes(f.key);
              const missing = value === "Not on file" || value === "Unknown" || value === "None";
              return (
                <div key={f.key} className="grid grid-cols-[7.5rem_1fr] gap-2 px-3 py-1.5 text-sm">
                  <dt className="font-bold text-ink-soft">{f.label}</dt>
                  <dd
                    key={`${f.key}:${value}`}
                    className={`rounded px-1 font-bold ${changed ? "flash-field" : ""} ${missing ? "text-ink-soft" : ""}`}
                  >
                    {value}
                  </dd>
                </div>
              );
            })}
          </dl>
        </section>
      ))}
      <section aria-label="Record history">
        <h3 className="text-sm font-extrabold uppercase tracking-wide text-ink-soft">History</h3>
        {view.history.length === 0 ? (
          <p className="mt-1 text-sm text-ink-soft">Nothing written yet.</p>
        ) : (
          <ol className="mt-1 space-y-1 text-sm">
            {view.history.map((h) => (
              <li key={h} className="flex gap-2">
                <span aria-hidden="true">•</span>
                <span>{h}</span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// The contractor's inbox
// ---------------------------------------------------------------------------

export function ContractorInbox({ msgs, children }: { msgs: Msg[]; children?: ReactNode }) {
  return (
    <div className="space-y-3">
      {children}
      {msgs.length === 0 ? (
        <p className="rounded-xl bg-cream p-3 text-sm font-bold text-ink-soft">No email yet. Porchlight only emails a contractor after an owner tap.</p>
      ) : (
        <ul className="space-y-2" aria-label="Contractor emails">
          {msgs.map((m) => (
            <li key={m.id} className="reveal rounded-xl border border-line bg-white p-3 text-sm">
              <p className="flex flex-wrap items-center gap-2 text-xs font-bold text-ink-soft">
                <Badge tone={m.dir === "in" ? "info" : "good"} icon={false}>
                  {m.dir === "in" ? "From the contractor" : "From Porchlight, approved by the owner"}
                </Badge>
                <span className="ml-auto">{clockText(m.at)}</span>
              </p>
              <p className="mt-1 whitespace-pre-line">{m.text}</p>
              {m.attachment && <Attachment title={m.attachment.title} body={m.attachment.body} />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function TapNote({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-start gap-2 text-sm text-ink-soft">
      <TapIcon size={18} />
      <span>{children}</span>
    </p>
  );
}
