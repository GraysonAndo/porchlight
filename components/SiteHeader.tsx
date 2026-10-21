"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GearIcon } from "./icons";
import { Logo } from "./Logo";
import { OWNER_NAV, TENANT_NAV, isActive, roleForPath } from "@/lib/steps";
import { PROPERTY } from "@/lib/seed";

/** The header for pages that belong to neither side: the welcome page, About, Pricing, and Feedback. Same links on every one. */
export function PublicHeader() {
  const pathname = usePathname();
  const links = [
    { href: "/about#team", label: "Our team" },
    { href: "/about", label: "About" },
    { href: "/pricing", label: "Pricing" },
  ];
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center gap-2 px-4 py-2 sm:px-6">
        <Link href="/" className="mr-auto inline-flex min-h-11 items-center rounded-lg" aria-label="GoHome home">
          <Logo />
        </Link>
        <nav aria-label="More about GoHome" className="flex gap-0.5 text-sm font-bold sm:gap-1">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={pathname === l.href ? "page" : undefined}
              className={`inline-flex min-h-11 items-center rounded-lg px-2 sm:px-3 ${pathname === l.href ? "bg-brand-tint text-brand" : "text-ink-soft hover:bg-cream-deep hover:text-ink"}`}
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  const role = roleForPath(pathname);
  if (!role) return <PublicHeader />;
  const nav = role === "owner" ? OWNER_NAV : role === "tenant" ? TENANT_NAV : [];
  const name = role === "owner" ? PROPERTY.owner : PROPERTY.tenant;

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center gap-4 px-4 py-2 sm:px-6">
        <Link href={role ? (role === "owner" ? "/owner" : "/tenant") : "/"} className="inline-flex min-h-11 items-center rounded-lg" aria-label="GoHome">
          <Logo />
        </Link>
        {nav.length > 0 && (
          <nav aria-label={`${role === "owner" ? "Owner" : "Tenant"} navigation`} className="ml-4 hidden items-center gap-1 md:flex">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive(pathname, item) ? "page" : undefined}
                className={`inline-flex min-h-11 items-center rounded-lg px-3 text-base font-bold transition-colors ${
                  isActive(pathname, item) ? "bg-brand-tint text-brand" : "text-ink-soft hover:bg-cream-deep hover:text-ink"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        )}
        {role && (
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden text-right text-sm leading-tight sm:block">
              <span className="block font-bold">{name}</span>
              <span className="block text-ink-soft">{role === "owner" ? "Owner" : "Tenant"}</span>
            </span>
            <Link
              href={`/${role}/settings`}
              aria-label="Settings"
              aria-current={pathname === `/${role}/settings` ? "page" : undefined}
              className={`inline-flex h-11 w-11 items-center justify-center rounded-lg ${pathname === `/${role}/settings` ? "bg-brand-tint text-brand" : "text-ink-soft hover:bg-cream-deep hover:text-ink"}`}
            >
              <GearIcon size={24} />
            </Link>
            <Link href={role === "owner" ? "/tenant" : "/owner"} className="btn btn-secondary !min-h-10 !px-3 text-sm">
              Switch to {role === "owner" ? "tenant" : "owner"}
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}

/** Bottom tab bar on phones, so the main places are one thumb tap away. */
export function MobileTabs() {
  const pathname = usePathname();
  const role = roleForPath(pathname);
  const nav = role === "owner" ? OWNER_NAV : role === "tenant" ? TENANT_NAV : [];
  if (nav.length === 0) return null;
  return (
    <nav
      aria-label={`${role === "owner" ? "Owner" : "Tenant"} tabs`}
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white md:hidden"
    >
      <ul className={`mx-auto grid max-w-md ${nav.length === 2 ? "grid-cols-2" : nav.length === 3 ? "grid-cols-3" : "grid-cols-4"}`}>
        {nav.map((item) => {
          const active = isActive(pathname, item);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-14 items-center justify-center px-2 text-sm font-bold ${active ? "text-brand" : "text-ink-soft"}`}
              >
                <span className={`rounded-full px-3 py-1 ${active ? "bg-brand-tint" : ""}`}>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
