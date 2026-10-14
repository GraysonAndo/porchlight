"use client";

// Demo state: one small external store, exposed through a React context.
// State is saved to localStorage. Every read and write is wrapped in try/catch
// so the app still works if storage is blocked (private mode, strict settings).

import { createContext, useContext, useSyncExternalStore, type ReactNode } from "react";
import { openOwnerMessage, send as agentStep, advanceTo, nextTimerAt } from "./agents/engine";
import { stampReveal } from "./agents/pacing";
import { syncFromWorld } from "./agents/sync";
import type { Ev } from "./agents/types";
import { DEFAULT_RENT_FORM, INITIAL_STATE } from "./seed";
import type {
  Approval,
  DemoState,
  FeedbackNote,
  Photo,
  QuoteCheckResult,
  RentFormState,
  RepairRequest,
  Role,
  TriageResult,
  WaterHeaterRecord,
} from "./types";

const STORAGE_KEY = "porchlight-demo-v1";
/** Photos bigger than this (as a data URL) are not kept across reloads. */
const MAX_STORED_PHOTO_CHARS = 120_000;

// ---------- storage ----------

function slimPhoto(photo: Photo): Photo {
  return !photo.isSample && photo.src.length > MAX_STORED_PHOTO_CHARS ? { ...photo, src: "" } : photo;
}

function toStorable(state: DemoState): DemoState {
  return {
    ...state,
    request: state.request ? { ...state.request, photos: state.request.photos.map(slimPhoto) } : null,
    houseRecord: state.houseRecord
      ? { ...state.houseRecord, photo: state.houseRecord.photo ? slimPhoto(state.houseRecord.photo) : null }
      : null,
  };
}

function readStorage(): DemoState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return INITIAL_STATE;
    const parsed = JSON.parse(raw) as Partial<DemoState>;
    return {
      ...INITIAL_STATE,
      ...parsed,
      rent: { ...DEFAULT_RENT_FORM, ...(parsed.rent ?? {}) },
      textUpdates: { ...INITIAL_STATE.textUpdates, ...(parsed.textUpdates ?? {}) },
      agent: parsed.agent && Array.isArray(parsed.agent.timeline) ? { ...INITIAL_STATE.agent, ...parsed.agent } : INITIAL_STATE.agent,
      feedback: Array.isArray(parsed.feedback) ? parsed.feedback : [],
    };
  } catch {
    return INITIAL_STATE;
  }
}

function writeStorage(state: DemoState): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(toStorable(state)));
  } catch {
    // Storage blocked or full. The app keeps working with in-memory state.
  }
}

function clearStorage(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore.
  }
}

// ---------- external store ----------

let current: DemoState = INITIAL_STATE;
let loaded = false;
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): DemoState {
  if (!loaded) {
    current = readStorage();
    loaded = true;
  }
  return current;
}

// The server (and the first hydration render) always sees the seed state.
function getServerSnapshot(): DemoState {
  return INITIAL_STATE;
}

function update(change: (state: DemoState) => DemoState): void {
  current = change(getSnapshot());
  writeStorage(current);
  listeners.forEach((l) => l());
}

// ---------- actions ----------

function newId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
  }
}

/** Runs one event through the agent, stamps when each new entry appears, and syncs the detail screens. */
function runAgent(s: DemoState, ev: Ev, speed = 1): DemoState {
  const before = s.agent;
  const after = stampReveal(agentStep(before, ev), before.timeline.length, Date.now(), speed);
  return { ...s, agent: after, ...syncFromWorld(s, before, after, ev, new Date().toISOString()) };
}

export interface DemoActions {
  setRole(role: Role | null): void;
  submitRequest(description: string, photos: Photo[]): void;
  setTriage(result: TriageResult): void;
  saveHouseRecord(record: WaterHeaterRecord): void;
  setQuoteCheck(result: QuoteCheckResult): void;
  setRent(patch: Partial<RentFormState>): void;
  approve(approval: Approval): void;
  clearApproval(): void;
  setTenantAnswers(answers: string[]): void;
  confirmAccess(value: "confirmed" | "needs-change"): void;
  completeJob(): void;
  skipTenantLabel(): void;
  /** Demo only: mark this month's rent paid or unpaid. Nothing is charged. */
  setRentPaid(paid: boolean): void;
  /** Send an event to Porchlight's agent (a text, a photo, a tap). */
  agentSend(ev: Ev): void;
  /** Send several events at once, shown quickly (used by "Show me a sample repair"). */
  agentSendMany(evs: Ev[]): void;
  /** Move the agent's clock to its next scheduled event, such as the vendor quotes arriving. */
  agentAdvance(): void;
  setTextUpdates(party: "tenant" | "owner", on: boolean): void;
  setPricingPick(pick: "starter" | "plus" | "pro" | "none" | null): void;
  addFeedback(input: { screen: string; rating: number; note: string }): void;
  clearFeedback(): void;
  reset(): void;
}

export const actions: DemoActions = {
  setRole: (role) => update((s) => ({ ...s, role })),
  // A new request starts the story over, so results that depend on it are cleared.
  submitRequest: (description, photos) =>
    update((s) => {
      const request: RepairRequest = { description, photos, submittedAt: new Date().toISOString() };
      // The house record belongs to the home, not to one request, so it is kept.
      return {
        ...s,
        request,
        triage: null,
        approval: null,
        tenantAnswers: null,
        tenantAccess: null,
        jobCompletedAt: null,
        tenantSkippedLabel: false,
      };
    }),
  setTriage: (triage) => update((s) => ({ ...s, triage })),
  saveHouseRecord: (houseRecord) => update((s) => ({ ...s, houseRecord })),
  setQuoteCheck: (quoteCheck) => update((s) => ({ ...s, quoteCheck })),
  setRent: (patch) => update((s) => ({ ...s, rent: { ...s.rent, ...patch } })),
  // Approving on the booking screen goes through the agent too, so the texts and the status stay in step.
  approve: (approval) =>
    update((s) => {
      let next: DemoState = { ...s, approval };
      if (s.agent.triage.stage === "decision_sent") {
        next = runAgent(next, { type: "owner.choose", vendorId: approval.vendorId, notToExceed: approval.notToExceed, accessWindow: approval.accessWindow });
        const open = openOwnerMessage(next.agent);
        if (open?.actions?.some((a) => a.id === "approve")) next = runAgent(next, { type: "owner.tap", msgId: open.id, action: "approve" });
        next = { ...next, approval };
      }
      return next;
    }),
  clearApproval: () =>
    update((s) => ({ ...s, approval: null, tenantAccess: null, jobCompletedAt: null })),
  agentSend: (ev) => update((s) => runAgent(s, ev)),
  agentSendMany: (evs) => update((s) => evs.reduce((acc, ev) => runAgent(acc, ev, 4), s)),
  agentAdvance: () =>
    update((s) => {
      const at = nextTimerAt(s.agent);
      if (at === null) return s;
      const before = s.agent;
      const after = stampReveal(advanceTo(before, at), before.timeline.length, Date.now());
      return { ...s, agent: after, ...syncFromWorld(s, before, after, { type: "timer", id: "quotes_in" }, new Date().toISOString()) };
    }),
  setTextUpdates: (party, on) => update((s) => ({ ...s, textUpdates: { ...s.textUpdates, [party]: on } })),
  setTenantAnswers: (tenantAnswers) => update((s) => ({ ...s, tenantAnswers })),
  confirmAccess: (tenantAccess) => update((s) => ({ ...s, tenantAccess })),
  completeJob: () => update((s) => ({ ...s, jobCompletedAt: new Date().toISOString() })),
  skipTenantLabel: () => update((s) => ({ ...s, tenantSkippedLabel: true })),
  setRentPaid: (paid) =>
    update((s) => runAgent({ ...s, rentPaidAt: paid ? new Date().toISOString() : null }, { type: "rent.paid", paid })),
  setPricingPick: (pricingPick) => update((s) => ({ ...s, pricingPick })),
  addFeedback: ({ screen, rating, note }) =>
    update((s) => {
      const entry: FeedbackNote = {
        id: newId(),
        screen,
        rating,
        note,
        timestamp: new Date().toISOString(),
      };
      return { ...s, feedback: [...s.feedback, entry] };
    }),
  clearFeedback: () => update((s) => ({ ...s, feedback: [] })),
  reset: () => {
    clearStorage();
    current = INITIAL_STATE;
    loaded = true;
    listeners.forEach((l) => l());
  },
};

// ---------- React context ----------

interface DemoContextValue {
  state: DemoState;
  actions: DemoActions;
  /** False on the server and during the first client render, true after. */
  hydrated: boolean;
}

const DemoContext = createContext<DemoContextValue | null>(null);

const subscribeNever = () => () => {};

export function StoreProvider({ children }: { children: ReactNode }) {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const hydrated = useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false,
  );
  return <DemoContext.Provider value={{ state, actions, hydrated }}>{children}</DemoContext.Provider>;
}

export function useDemo(): DemoContextValue {
  const value = useContext(DemoContext);
  if (!value) throw new Error("useDemo must be used inside StoreProvider");
  return value;
}
