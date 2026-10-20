"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { MobileTabs, SiteHeader } from "./SiteHeader";
import { SiteFooter } from "./SiteFooter";
import { FlowPrompt } from "./FlowPrompt";

/** The frame around every page: a header (the role's own, or the public one), the page, and one footer. */
export function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  // The embedded checkout sits inside another page, so it has no frame of its own.
  if (pathname === "/checkout") return <main id="main">{children}</main>;
  // The welcome page has the same header and footer as every other page, with its own full-width content.
  if (pathname === "/") {
    return (
      <>
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
