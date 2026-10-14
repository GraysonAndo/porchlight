"use client";

// A conversation with Porchlight, as a text thread. The same component is used for the tenant
// (the whole screen) and the owner (the "texts from Porchlight" list).

import { useEffect, useRef } from "react";
import { LogoMark } from "./Logo";
import { Bubble, Composer, OwnerButtons, Typing } from "./Sms";
import type { Msg, PhotoKind } from "@/lib/agents/types";

interface ThreadProps {
  party: "tenant" | "owner";
  msgs: Msg[];
  typing: boolean;
  placeholder: string;
  onSend: (text: string) => void;
  onPhoto?: (kind: PhotoKind) => void;
  /** Show action buttons under messages (the owner's cards usually take them instead) */
  onTap?: (msgId: string, action: string) => void;
  suggestions?: { label: string; text: string }[];
  /** "text" shows Texted under each message from Porchlight, "app" shows In app only */
  via: "text" | "app";
  empty: string;
  heightClass?: string;
  photoLabels?: [PhotoKind, string][];
}

export function Thread({ party, msgs, typing, placeholder, onSend, onPhoto, onTap, suggestions, via, empty, heightClass = "h-[22rem] sm:h-[30rem]", photoLabels }: ThreadProps) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = box.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [msgs.length, typing]);

  return (
    <section aria-label="Messages with Porchlight" className="overflow-hidden rounded-3xl border border-line bg-white shadow-sm">
      <div className="flex items-center gap-3 border-b border-line bg-cream px-4 py-3">
        <LogoMark size={34} />
        <div>
          <p className="font-extrabold leading-tight">Porchlight</p>
          <p className="text-xs font-bold text-ink-soft">{via === "text" ? "Texts you every update" : "Updates show here (text updates are off)"}</p>
        </div>
      </div>
      <div ref={box} className={`${heightClass} overflow-y-auto bg-cream/60 p-3`}>
        <div role="log" aria-live="polite" aria-label="Messages" className="space-y-3">
          {msgs.length === 0 && !typing && <p className="mt-16 px-4 text-center font-bold text-ink-soft">{empty}</p>}
          {msgs.map((m) => (
            <div key={m.id} className="space-y-2">
              <Bubble msg={m} perspective={party} via={via} />
              {onTap && m.dir === "out" && <OwnerButtons msg={m} onTap={onTap} />}
            </div>
          ))}
          {typing && <Typing />}
        </div>
      </div>
      <Composer
        party={party}
        last={msgs[msgs.length - 1]}
        placeholder={placeholder}
        onSend={onSend}
        onPhoto={onPhoto}
        suggestions={suggestions}
        photoLabels={photoLabels}
        className="border-t border-line bg-white p-3"
      />
    </section>
  );
}
