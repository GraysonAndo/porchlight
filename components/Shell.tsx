"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { MobileTabs, SiteHeader } from "./SiteHeader";
import { SiteFooter } from "./SiteFooter";
import { FlowPrompt } from "./FlowPrompt";
import { PAGE_TITLES } from "@/lib/steps";

/** The frame around every page: a header (the role's own, or the public one), the page, and one footer. */
export function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  // Each page has its own tab title, so a person with several tabs open can tell them apart.
  const clean = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  const name = clean.startsWith("/tenant/guides/") ? "How-to guide" : PAGE_TITLES[clean];
  // A path with no name is one that does not exist, so the tab says so.
  const title = clean === "/" ? "GoHome: your home, made easy" : `${name ?? "Page not found"} | GoHome`;
  // The embedded checkout sits inside another page, so it has no frame of its own.
  if (pathname === "/checkout") return <main id="main">{children}</main>;
  const heading = <title>{title}</title>;
  // The welcome page has the same header and footer as every other page, with its own full-width content.
  if (pathname === "/") {
    return (
      <>
        {heading}
        <SiteHeader />
        <main id="main" className="flex flex-1 flex-col">
          {children}
        </main>
        <SiteFooter />
      </>
    );
  }
  return (
    <>
      {heading}
      <SiteHeader />
      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 pb-24 pt-5 sm:px-6 md:pb-10">
        <FlowPrompt />
        {children}
      </main>
      <SiteFooter />
      <MobileTabs />
    </>
  );
}
