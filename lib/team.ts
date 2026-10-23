// The founding team. Photos are optional: put a square headshot at public/team/<photo>.jpg (png, jpeg, and webp also work)
// and it shows up at the next build. Until then, the avatar shows initials on its own shade of the brand palette.

export interface TeamMember {
  name: string;
  /** Shown under the name */
  role: string;
  /** File name without the extension, in public/team */
  photo: string;
  linkedin: string;
  /** At most two sentences: what they own at GoHome, then one specific credential */
  bio: string;
  /** Background for the initials circle if the photo is missing. White text on each of these passes WCAG AA. */
  shade: string;
}

export const TEAM: TeamMember[] = [
  {
    name: "Grayson Ando",
    role: "Co-founder & CEO",
    photo: "grayson",
    linkedin: "https://www.linkedin.com/in/grayson-ando/",
    bio: "Sets GoHome's direction and leads the product and every conversation with owners and tenants. He manages his family's rental property in San Jose and spent the summer as a Business Operations Analyst at SanDisk, so he knows both the landlord headaches and how to fix broken processes.",
    shade: "bg-brand",
  },
  {
    name: "Ezekiel Thun",
    role: "Co-founder & Head of Design",
    photo: "ezekiel",
    linkedin: "https://www.linkedin.com/in/ezekiel-thun-4b8853442/",
    bio: "Leads the brand, design, and customer discovery, from the welcome page to the step-by-step guides.",
    shade: "bg-ink",
  },
  {
    name: "Hayden Haar",
    role: "Co-founder & Head of Finance",
    photo: "hayden",
    linkedin: "https://www.linkedin.com/in/hayden-haar-a05502279/",
    bio: "Owns pricing, the repair-or-replace math, and the 5-year forecast, keeping every number honest and explainable.",
    shade: "bg-[#c2410c]",
  },
];

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
