import Link from "next/link";
import { Logo } from "./Logo";

export function SiteHeader() {
  return (
    <header className="border-b border-line bg-cream">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-2 sm:px-6">
        <Link href="/" className="inline-flex min-h-11 items-center rounded-lg" aria-label="Porchlight home">
          <Logo />
        </Link>
        <Link href="/feedback" className="btn btn-ghost !px-3 text-sm">
          Feedback notes
        </Link>
      </div>
    </header>
  );
}
