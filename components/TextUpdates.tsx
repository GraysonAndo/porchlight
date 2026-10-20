"use client";

import { BellIcon } from "./icons";
import { SwitchRow } from "./Switch";
import { useDemo } from "@/lib/store";

/** "Text updates": GoHome texts this person every update. They can turn it off. Lives in Settings. */
export function TextUpdatesToggle({ party }: { party: "tenant" | "owner" }) {
  const { state, actions } = useDemo();
  const on = state.textUpdates[party];
  const phone = party === "tenant" ? state.prefs.tenantPhone : state.prefs.ownerPhone;
  return (
    <SwitchRow
      title="Text updates"
      description={on ? `In the full product, GoHome texts ${phone} each time something changes.` : "Updates only show here in the app."}
      on={on}
      onChange={(next) => actions.setTextUpdates(party, next)}
      icon={<BellIcon size={20} />}
    />
  );
}
