// Reads what was saved in the browser and makes it safe to use. Saved data can be from an older version of the app, half
// written, edited by hand, or not even an object. Whatever it is, the app should start from something sound and never
// stay broken until the owner clears their browser by hand.

import { createWorld } from "./agents/world";
import type { Entry, Scheduled, World } from "./agents/types";
import { DEFAULT_RENT_FORM, INITIAL_STATE } from "./seed";
import type { DemoState } from "./types";

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const isEntry = (e: unknown): e is Entry =>
  isObject(e) && typeof e.id === "string" && typeof e.at === "number" && Number.isFinite(e.at) && (e.kind === "msg" || e.kind === "tool" || e.kind === "record");
const isScheduled = (s: unknown): s is Scheduled => isObject(s) && typeof s.at === "number" && Number.isFinite(s.at) && typeof s.id === "string";

/** The agent's saved world, filled in where an older version left parts out, with bad entries dropped. */
export function normalizeWorld(saved: unknown): World {
  const base = createWorld();
  if (!isObject(saved) || !Array.isArray(saved.timeline)) return base;
  const merge = <T extends object>(defaults: T, value: unknown): T => ({ ...defaults, ...(isObject(value) ? (value as Partial<T>) : {}) });
  return {
    ...base,
    ...(saved as Partial<World>),
    clock: typeof saved.clock === "number" && Number.isFinite(saved.clock) ? saved.clock : base.clock,
    seq: typeof saved.seq === "number" && Number.isFinite(saved.seq) ? saved.seq : saved.timeline.length,
    timeline: saved.timeline.filter(isEntry),
    pending: Array.isArray(saved.pending) ? saved.pending.filter(isScheduled) : [],
    triage: merge(base.triage, saved.triage),
    quote: merge(base.quote, saved.quote),
    sentinel: merge(base.sentinel, saved.sentinel),
    stats: merge(base.stats, saved.stats),
    rentPaid: saved.rentPaid === true,
    choice: isObject(saved.choice) ? (saved.choice as World["choice"]) : null,
  };
}

/** The saved state from the browser, or a clean start when it is missing, damaged, or not what this version expects. */
export function normalizeState(parsed: unknown): DemoState {
  if (!isObject(parsed)) return INITIAL_STATE;
  const p = parsed as Partial<DemoState>;
  const prefs = { ...INITIAL_STATE.prefs, ...(isObject(p.prefs) ? p.prefs : {}) };
  // A setting of the wrong type goes back to its default instead of being trusted.
  for (const key of Object.keys(INITIAL_STATE.prefs) as (keyof typeof prefs)[]) {
    if (typeof prefs[key] !== typeof INITIAL_STATE.prefs[key] && !(key === "tenantAutopayMethod" && (prefs[key] === null || typeof prefs[key] === "string"))) {
      (prefs as Record<string, unknown>)[key] = INITIAL_STATE.prefs[key];
    }
  }
  if (!Number.isFinite(prefs.ownerAutoApprove) || prefs.ownerAutoApprove < 0) prefs.ownerAutoApprove = 0;
  return {
    ...INITIAL_STATE,
    ...p,
    request: isObject(p.request) && typeof p.request.description === "string" && Array.isArray(p.request.photos) ? p.request : null,
    rent: { ...DEFAULT_RENT_FORM, ...(isObject(p.rent) ? p.rent : {}) },
    textUpdates: { ...INITIAL_STATE.textUpdates, ...(isObject(p.textUpdates) ? p.textUpdates : {}) },
    prefs,
    payments: Array.isArray(p.payments) ? p.payments : [],
    rentNotice: isObject(p.rentNotice) ? p.rentNotice : null,
    rentNoticeLog: Array.isArray(p.rentNoticeLog) ? p.rentNoticeLog : isObject(p.rentNotice) ? [p.rentNotice] : [],
    extraEquipment: Array.isArray(p.extraEquipment) ? p.extraEquipment : [],
    guideProgress: isObject(p.guideProgress) ? p.guideProgress : {},
    equipmentEdits: isObject(p.equipmentEdits) ? p.equipmentEdits : {},
    agent: normalizeWorld(p.agent),
    feedback: Array.isArray(p.feedback) ? p.feedback : [],
  } as DemoState;
}
