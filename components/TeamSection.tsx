// "The team behind GoHome". A photo is used if its file exists in public/team (checked when the site is built), and the
// avatar shows initials on a different brand shade otherwise, so a missing photo never causes a broken image.

import { existsSync } from "node:fs";
import { join } from "node:path";
import { FadeIn } from "./FadeIn";
import { LinkedInIcon } from "./icons";
import { TEAM, initials, type TeamMember } from "@/lib/team";

function photoFile(member: TeamMember): string | null {
  for (const ext of ["jpg", "jpeg", "png", "webp"]) {
    if (existsSync(join(process.cwd(), "public", "team", `${member.photo}.${ext}`))) return `/team/${member.photo}.${ext}`;
  }
  return null;
}

const RING = "ring-2 ring-white shadow-md";

function Avatar({ member }: { member: TeamMember }) {
  const src = photoFile(member);
  return src ? (
    // Plain img on purpose: it is a local file, so there is nothing to optimize.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={`Photo of ${member.name}`} width={120} height={120} className={`h-24 w-24 shrink-0 rounded-full bg-cream-deep object-cover md:h-[120px] md:w-[120px] ${RING}`} />
  ) : (
    <span
      aria-hidden="true"
      className={`inline-flex h-24 w-24 shrink-0 items-center justify-center rounded-full text-3xl font-extrabold text-white md:h-[120px] md:w-[120px] md:text-4xl ${member.shade} ${RING}`}
    >
      {initials(member.name)}
    </span>
  );
}

export function TeamSection() {
  return (
    <section id="team" className="scroll-mt-4 space-y-4 md:-mx-16 lg:-mx-32" aria-labelledby="team-heading">
      <div className="text-center">
        <h2 id="team-heading" className="text-2xl font-extrabold sm:text-3xl">
          The team behind GoHome
        </h2>
        <p className="mx-auto mt-1 max-w-xl text-ink-soft">Three UCSB students building the property manager we wish small landlords had.</p>
      </div>
      <ul className="grid gap-3 md:grid-cols-3 md:gap-4">
        {TEAM.map((m, i) => (
          <li key={m.name}>
            <FadeIn delayMs={i * 90} className="h-full">
              <article className="team-card card flex h-full flex-col items-center gap-2 !p-4 text-center">
                <Avatar member={m} />
                <div>
                  <div className="flex items-center justify-center gap-1">
                    <h3 className="text-lg font-extrabold leading-tight">{m.name}</h3>
                    <a
                      href={m.linkedin}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`${m.name} on LinkedIn (opens in a new tab)`}
                      className="-my-2 inline-flex h-11 w-11 items-center justify-center rounded-lg text-[#0a66c2] hover:bg-cream-deep"
                    >
                      <LinkedInIcon size={24} />
                    </a>
                  </div>
                  <p className="-mt-1 text-sm font-bold text-brand">{m.role}</p>
                </div>
                <p className="text-sm leading-relaxed">{m.bio}</p>
              </article>
            </FadeIn>
          </li>
        ))}
      </ul>
    </section>
  );
}
