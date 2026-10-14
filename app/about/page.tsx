import Link from "next/link";
import { PlaceholderNote } from "@/components/ui";

const FAQ: { q: string; a: string }[] = [
  {
    q: "What counts as an emergency?",
    a: "A gas smell, smoke or sparks, flooding, water near electricity, or no heat. For these, Porchlight gives your tenant no fix steps. It tells them to get safe and call 911 or the gas company, and it alerts you right away, by call if needed.",
  },
  {
    q: "What does my tenant see?",
    a: "A simple page, or text messages. They text a problem (or a question) on one screen, get safe steps, send one photo of an equipment label if asked, and get a text for every update. Answers come only from the house record and the lease on file, and if it is not there, Porchlight says it does not know. They never see prices, quotes, or your decisions.",
  },
  {
    q: "Does the AI set prices or the rent cap?",
    a: "No. The AI reads photos and writes messages. Prices, repair or replace, and the California rent cap come from plain code and a hand-checked table, and each screen says so. Nothing is spent without your tap.",
  },
  {
    q: "What happens to my data?",
    a: "In this prototype, nothing leaves your browser. A real version would store the house record, photos, and messages securely, never sell them, and let you delete them. A real privacy policy is needed before anyone relies on it.",
  },
  {
    q: "Is this legal advice?",
    a: "No. Rent notices and cap math are drafts, labeled as such. Local rules, like San Jose's, can be stricter than state law. Check with an attorney before sending.",
  },
  {
    q: "Which states does it work in?",
    a: "California only, for now.",
  },
];

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <p className="eyebrow mb-2">About Porchlight</p>
        <h1 className="font-display text-4xl font-extrabold leading-tight sm:text-5xl">How it works, and why you can trust it</h1>
        <p className="mt-3 text-lg text-ink-soft">
          Porchlight is a class prototype for owners with 1 to 10 rental units in California. Here is how the prices work,
          the questions people ask, and how to reach us.
        </p>
      </div>

      <section id="price-ranges" className="card scroll-mt-4 space-y-2" aria-labelledby="price-heading">
        <h2 id="price-heading" className="font-display text-2xl font-extrabold">
          How our price ranges work
        </h2>
        <p>
          A quote is checked against a typical price range for each item, like the unit, the labor, and the permit. The
          ranges come from a hand-checked table. The AI does not make them up and does not judge a price.
        </p>
        <ul className="list-disc space-y-1 pl-6">
          <li>A quote inside the range is fair. Up to 15% above the top is slightly high. More than that is high. Below the range may mean something is left out.</li>
          <li>The total range is the sum of the item ranges, so the total never disagrees with its parts.</li>
          <li>If a job is not in the table, Porchlight says so. It never invents a range.</li>
        </ul>
        <p>
          <PlaceholderNote /> <span className="text-sm text-ink-soft">In this prototype the ranges are placeholders. A real version would build them from local quotes and invoices.</span>
        </p>
      </section>

      <section id="faq" className="scroll-mt-4 space-y-2" aria-labelledby="faq-heading">
        <h2 id="faq-heading" className="font-display text-2xl font-extrabold">
          Questions
        </h2>
        <div className="space-y-2">
          {FAQ.map((item) => (
            <details key={item.q} className="card !p-0">
              <summary className="flex min-h-11 cursor-pointer items-center px-5 py-3 font-extrabold">{item.q}</summary>
              <p className="px-5 pb-4">{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section id="contact" className="card scroll-mt-4 space-y-2" aria-labelledby="contact-heading">
        <h2 id="contact-heading" className="font-display text-2xl font-extrabold">
          Contact
        </h2>
        <p>
          Porchlight is built by a student team for UCSB TMP 122. The easiest way to reach us is the &quot;Leave
          feedback&quot; button on any page. You can also email{" "}
          <span className="font-bold">porchlight-team@example.com</span> (a placeholder address for the demo).
        </p>
        <p>
          <Link href="/pricing" className="font-bold underline underline-offset-4">
            See the pricing test
          </Link>
        </p>
      </section>
    </div>
  );
}
