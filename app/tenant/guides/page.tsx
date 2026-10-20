import { redirect } from "next/navigation";

// The guides are listed on My home, next to the equipment each one is for.
export default function GuidesIndex() {
  redirect("/tenant/home");
}
