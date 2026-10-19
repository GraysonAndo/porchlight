// The leadership team. Photos are optional: put a square image at public/team/<photo>.jpg and it shows up by itself.
// Until then, the avatar shows initials. The bios below describe each person's role at GoHome. Add your own lines
// about yourselves (school, past work, why you care) in `about`.

export interface TeamMember {
  name: string;
  role: string;
  /** File name without the extension, in public/team */
  photo: string;
  linkedin: string;
  /** What this person leads at GoHome */
  bio: string;
  /** A line about the person themselves. Fill this in. */
  about?: string;
}

export const TEAM: TeamMember[] = [
  {
    name: "Grayson Ando",
    role: "Chief Executive Officer",
    photo: "grayson-ando",
    linkedin: "https://www.linkedin.com/in/grayson-ando/",
    bio: "Grayson sets GoHome's direction and leads the product and the conversations with owners and tenants. His rule for every screen: if a person has to think about how to use it, it is not done yet.",
  },
  {
    name: "Ezekiel Thun",
    role: "Chief Creative Officer",
    photo: "ezekiel-thun",
    linkedin: "https://www.linkedin.com/in/ezekiel-thun-4b8853442/",
    bio: "Ezekiel leads the brand, the look, and the feel of GoHome, from the welcome page to the step-by-step guides. He makes sure a stressed tenant at 4 AM and a busy owner at lunch both find the next step right away.",
  },
  {
    name: "Hayden Haar",
    role: "Chief Financial Officer",
    photo: "hayden-haar",
    linkedin: "https://www.linkedin.com/in/hayden-haar-a05502279/",
    bio: "Hayden leads GoHome's finances, pricing, and the numbers owners rely on, like the repair or replace math, the 5-year forecast, and what each tier costs per unit. He keeps every number honest and explainable.",
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
