"use client";

// The pieces of a message thread with GoHome: bubbles, quick replies, and the message box.
// The tenant screen, the owner inbox, and the agent panel all draw from one timeline of entries.

import { useState } from "react";
import { GuideButton } from "./GuideViewer";
import { LogoMark } from "./Logo";
import { CameraIcon, CheckIcon, MoonIcon, PhoneCallIcon } from "./icons";
import { clockText } from "@/lib/agents/engine";
import type { Msg, MsgAction, Party, PhotoKind } from "@/lib/agents/types";

const PHOTO_SRC: Record<PhotoKind, string> = {
  leak: "/sample/leaking-heater.svg",
};

const PHOTO_ALT: Record<PhotoKind, string> = {
  leak: "Photo sent by the tenant: a water heater leaking at the base, with a puddle on the garage floor",
};

export function Typing() {
  return (
    <div className="flex items-end gap-2" role="status" aria-label="GoHome is typing">
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

export function Bubble({ msg, perspective, via }: { msg: Msg; perspective: Party; via?: "text" | "app" }) {
  const mine = msg.dir === "in" && msg.party === perspective;

  if (msg.channel === "call") {
    return (
      <div className="reveal rounded-2xl border-2 border-urgent bg-urgent-tint p-3 text-sm">
        <p className="flex items-center gap-2 font-extrabold text-urgent">
          <PhoneCallIcon size={20} /> Incoming call from GoHome
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
        {msg.guide && (
          <div className="mt-2">
            <GuideButton guideId={msg.guide} />
          </div>
        )}
        <p className="mt-1 flex items-center justify-end gap-1.5 text-[11px] font-bold opacity-60">
          {msg.silent && (
            <span className="inline-flex items-center gap-1">
              <MoonIcon size={12} /> Delivered silently
            </span>
          )}
          {mine && <span>Delivered</span>}
          {!mine && via && <span>{via === "text" ? "Text (sample)" : "In app only"}</span>}
          <span>{clockText(msg.at)}</span>
        </p>
      </div>
    </div>
  );
}

export function OwnerButtons({ msg, onTap }: { msg: Msg; onTap: (msgId: string, action: string) => void }) {
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

export interface ComposerProps {
  party: "tenant" | "owner";
  last: Msg | undefined;
  placeholder: string;
  onSend: (text: string) => void;
  onPhoto?: (kind: PhotoKind) => void;
  suggestions?: { label: string; text: string }[];
  /** Words for the photo menu, for example "Photo of the label" */
  photoLabels?: [PhotoKind, string][];
  className?: string;
}

const DEFAULT_PHOTOS: [PhotoKind, string][] = [["leak", "Photo of the problem"]];

/** The message box: quick replies, a photo button, and a text field. */
export function Composer({ party, last, placeholder, onSend, onPhoto, suggestions, photoLabels = DEFAULT_PHOTOS, className = "border-t border-line bg-white/80 p-2" }: ComposerProps) {
  const [draft, setDraft] = useState("");
  const [menu, setMenu] = useState(false);
  // Tenant quick replies live under the latest message from GoHome, until the tenant answers.
  const chips = party === "tenant" && last && last.dir === "out" && last.actions ? last.actions : [];

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    onSend(text);
    setDraft("");
  }

  return (
    <div className={className}>
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
          {photoLabels.map(([kind, text]) => (
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
          maxLength={500}
        />
        <button type="submit" className="btn btn-primary !min-h-11 !px-4 text-sm" disabled={!draft.trim()}>
          Send
        </button>
      </form>
    </div>
  );
}
