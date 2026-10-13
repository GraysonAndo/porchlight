"use client";

import { useEffect } from "react";
import { actions } from "@/lib/store";

/** Supports ?reset=1 on any page: clears the demo, then removes the flag from the URL. */
export function ResetOnQuery() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("reset") !== "1") return;
    actions.reset();
    params.delete("reset");
    const query = params.toString();
    window.history.replaceState(
      null,
      "",
      window.location.pathname + (query ? `?${query}` : "") + window.location.hash,
    );
  }, []);

  return null;
}
