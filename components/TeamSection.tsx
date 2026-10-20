// The leadership team. A photo is used if its file exists in public/team (checked when the site is built), and the
// avatar shows initials otherwise, so a missing photo never causes a broken image or a failed request.

import { existsSync } from "node:fs";
import { join } from "node:path";
import { TEAM, initials, type TeamMember } from "@/lib/team";

function photoFile(member: TeamMember): string | null {
  for (const ext of ["jpg", "jpeg", "png", "webp"]) {
    if (existsSync(join(process.cwd(), "public", "team", `${member.photo}.${ext}`))) return `/team/${member.photo}.${ext}`;
  }
  return null;
}

function Avatar({ member }: { member: TeamMember }) {
  const src = photoFile(member);
  return src ? (
    // Plain img on purpose: it is a local file, so there is nothing to optimize.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={`Photo of ${member.name}`} className="h-24 w-24 shrink-0 rounded-full border border-line bg-cream-deep object-cover" />
  ) : (
    <span aria-hidden="true" className="inline-flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-brand text-3xl font-extrabold text-white">
      {initials(member.name)}
    </span>
  );
}

export function TeamSection() {
  return (
    <section id="team" className="scroll-mt-4 space-y-4" aria-labelledby="team-heading">
      <div>
        <h2 id="team-heading" className="text-2xl font-extrabold">
          Our leadership team
        </h2>
        <p className="mt-1 text-ink-soft">GoHome is built by three people who think small landlords and their tenants deserve better.</p>
      </div>
      <ul className="grid gap-4 md:grid-cols-3">
        {TEAM.map((m) => (
          <li key={m.name} className="card flex flex-col gap-3">
            <div className="flex items-center gap-4">
              <Avatar member={m} />
              <div className="min-w-0">
                <p className="text-lg font-extrabold leading-tight">{m.name}</p>
                <p className="text-sm font-bold text-brand">{m.role}</p>
              </div>
            </div>
            <p className="text-sm">{m.bio}</p>
            {m.about && <p className="text-sm text-ink-soft">{m.about}</p>}
            <a href={m.linkedin} target="_blank" rel="noreferrer" className="btn btn-secondary mt-auto !min-h-10 text-sm" aria-label={`${m.name} on LinkedIn (opens in a new tab)`}>
              LinkedIn
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
