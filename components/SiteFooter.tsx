"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDemo } from "@/lib/store";

export function SiteFooter() {
  const { actions } = useDemo();
  const router = useRouter();

  return (
    <footer className="border-t border-line bg-cream-deep px-4 pb-24 pt-5 sm:px-6">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <nav aria-label="More about Porchlight" className="flex flex-wrap gap-x-4 gap-y-1 text-sm font-bold">
            <Link href="/pricing" className="inline-flex min-h-11 items-center underline underline-offset-4">
              Pricing
            </Link>
            <Link href="/about#price-ranges" className="inline-flex min-h-11 items-center underline underline-offset-4">
              How prices work
            </Link>
            <Link href="/about#faq" className="inline-flex min-h-11 items-center underline underline-offset-4">
              FAQ
            </Link>
            <Link href="/about#contact" className="inline-flex min-h-11 items-center underline underline-offset-4">
              Contact
            </Link>
          </nav>
          <p className="text-sm text-ink-soft">
            Porchlight is a class prototype. California only, for now. All names, prices, and addresses are fictional.
          </p>
        </div>
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
