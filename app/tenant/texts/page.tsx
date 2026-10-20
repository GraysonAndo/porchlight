import Link from "next/link";
import { PhoneThread } from "@/components/PhoneThread";

export default function TextsPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div>
        <Link href="/tenant/settings" className="inline-flex min-h-11 items-center font-bold text-brand underline underline-offset-4">
          &larr; Back
        </Link>
        <h1 className="mt-1 text-3xl font-extrabold leading-tight sm:text-4xl">What it will feel like by text</h1>
        <p className="mt-1 text-lg text-ink-soft">No app to open and no login. Just a conversation.</p>
      </div>
      <PhoneThread />
    </div>
  );
}
