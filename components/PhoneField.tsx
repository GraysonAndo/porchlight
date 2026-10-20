"use client";

// A phone number the person can correct. GoHome texts and calls this number, so a wrong one has to be fixable.

import { useState } from "react";
import { useDemo } from "@/lib/store";

/** "4085550134" or "(408) 555-0134" become "(408) 555-0134". Returns null unless there are exactly 10 digits. */
export function formatPhone(raw: string): string | null {
  const d = raw.replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "");
  return d.length === 10 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : null;
}

export function PhoneField({ party }: { party: "tenant" | "owner" }) {
  const { state, actions } = useDemo();
  const key = party === "owner" ? "ownerPhone" : "tenantPhone";
  const saved = state.prefs[key];
  const [draft, setDraft] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const shown = draft ?? saved;
  const formatted = formatPhone(shown);
  const error = draft !== null && formatted === null ? "Enter a 10 digit phone number, like (408) 555-0134." : "";

  return (
    <form
      noValidate
      className="space-y-1"
      onSubmit={(e) => {
        e.preventDefault();
        if (!formatted) return;
        actions.setPref(key, formatted);
        setDraft(null);
        setNote(`Saved. GoHome will use ${formatted}.`);
      }}
    >
      <label htmlFor={`${party}-phone`} className="label">
        Phone
      </label>
      <div className="flex gap-2">
        <input
          id={`${party}-phone`}
          className={`field ${error ? "!border-urgent" : ""}`}
          inputMode="tel"
          autoComplete="tel"
          value={shown}
          aria-invalid={error ? true : undefined}
          aria-describedby={`${party}-phone-note`}
          onChange={(e) => {
            setDraft(e.target.value);
            setNote("");
          }}
        />
        <button type="submit" className="btn btn-secondary" disabled={draft === null || !formatted}>
          Save
        </button>
      </div>
      <p id={`${party}-phone-note`} role={error ? "alert" : "status"} className={`text-sm font-bold ${error ? "text-urgent" : "text-good-ink"}`}>
        {error || note}
      </p>
    </form>
  );
}
