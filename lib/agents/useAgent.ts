"use client";

import { useEffect, useState } from "react";
import { useDemo } from "../store";
import { recordAt } from "./engine";
import type { Entry, Msg, Party, ToolCall } from "./types";

/**
 * GoHome's agent as the screens see it: only the entries whose time has come, so new texts
 * arrive one by one with a typing pause. Entries from before this page opened are simply there.
 */
export function useAgent() {
  const { state, actions } = useDemo();
  const world = state.agent;
  const [now, setNow] = useState(() => Date.now());

  let nextAt: number | null = null;
  let firstHidden: Entry | null = null;
  for (const e of world.timeline) {
    const at = e.revealAt ?? 0;
    if (at > now) {
      if (nextAt === null || at < nextAt) nextAt = at;
      if (firstHidden === null) firstHidden = e;
    }
  }

  useEffect(() => {
    if (nextAt === null) return;
    const t = setTimeout(() => setNow(Date.now()), Math.max(0, nextAt - Date.now()) + 10);
    return () => clearTimeout(t);
  }, [nextAt]);

  const visible = world.timeline.filter((e) => (e.revealAt ?? 0) <= now);
  const msgs = visible.filter((e): e is Msg => e.kind === "msg");
  const typingParty: Party | null = firstHidden && firstHidden.kind === "msg" && firstHidden.dir === "out" ? firstHidden.party : null;

  return {
    world,
    /** True while GoHome still has steps or messages that have not appeared yet (it is "working") */
    pending: firstHidden !== null,
    /** True while GoHome is waiting on someone else, such as plumbers sending quotes */
    waiting: world.pending.some((p) => p.id === "quotes_in"),
    visible,
    msgsFor: (party: Party) => msgs.filter((m) => m.party === party),
    typingFor: (party: Party) => typingParty === party,
    tools: visible.filter((e): e is ToolCall => e.kind === "tool"),
    record: recordAt(world.timeline, world.timeline.length),
    send: actions.agentSend,
    advance: actions.agentAdvance,
    textUpdates: state.textUpdates,
  };
}

/** The tenant reports the sample leak and answers everything, so an owner can see a finished case unfold. */
export function sampleRepairEvents(): import("./types").Ev[] {
  return [
    { type: "tenant.text", text: "water heater is leaking all over the garage" },
    { type: "tenant.text", text: "2" },
    { type: "tenant.text", text: "done" },
  ];
}
