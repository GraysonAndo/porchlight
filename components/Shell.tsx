"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { MobileTabs, SiteHeader } from "./SiteHeader";
import { SiteFooter } from "./SiteFooter";
import { FlowPrompt } from "./FlowPrompt";
import { PAGE_DESCRIPTIONS, PAGE_TITLES } from "@/lib/steps";

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
  const description = clean.startsWith("/tenant/guides/")
    ? "A short step-by-step guide with a picture on every step. Sample content."
    : (PAGE_DESCRIPTIONS[clean] ?? "This page does not exist. Go back to the GoHome welcome page.");
  const heading = (
    <>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta property="og:site_name" content="GoHome" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content="website" />
      <meta name="twitter:card" content="summary" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
    </>
  );
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
