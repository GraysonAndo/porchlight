"use client";

import { useRouter } from "next/navigation";
import { useDemo } from "@/lib/store";

export function SiteFooter() {
  const { actions } = useDemo();
  const router = useRouter();

  return (
    <footer className="border-t border-line bg-cream-deep px-4 pb-24 pt-5 sm:px-6">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-ink-soft">
          Porchlight is a class prototype. All names, prices, and addresses are fictional.
        </p>
        <button
          type="button"
          className="btn btn-secondary text-sm"
          onClick={() => {
            actions.reset();
            router.push("/");
          }}
        >
          Reset demo
        </button>
      </div>
    </footer>
  );
}
