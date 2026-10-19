"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { MobileTabs, SiteHeader } from "./SiteHeader";
import { SiteFooter } from "./SiteFooter";

/** The frame around every page. The landing page ("/") is full-screen and has no header or footer. */
export function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/") {
    return (
      <main id="main" className="flex min-h-screen flex-1 flex-col">
        {children}
      </main>
    );
  }
  return (
    <>
      <SiteHeader />
      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 pb-24 pt-5 sm:px-6 md:pb-10">
        {children}
      </main>
      <SiteFooter />
      <MobileTabs />
    </>
  );
}
