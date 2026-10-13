import type { Metadata } from "next";
import { Nunito_Sans } from "next/font/google";
import "./globals.css";
import { StoreProvider } from "@/lib/store";
import { Banner } from "@/components/Banner";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { DemoGuide } from "@/components/DemoGuide";
import { FeedbackButton } from "@/components/FeedbackButton";
import { ResetOnQuery } from "@/components/ResetOnQuery";

const nunito = Nunito_Sans({
  variable: "--font-nunito",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Porchlight: AI property manager (prototype)",
  description:
    "Clickable prototype of Porchlight, an AI property manager for owners with 1 to 10 rental units. All data is fictional.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={nunito.variable}>
      <body className="flex min-h-screen flex-col">
        <StoreProvider>
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:font-bold"
          >
            Skip to main content
          </a>
          <Banner />
          <SiteHeader />
          <DemoGuide />
          <main id="main" className="mx-auto w-full max-w-5xl flex-1 px-4 pb-24 pt-5 sm:px-6">
            {children}
          </main>
          <SiteFooter />
          <FeedbackButton />
          <ResetOnQuery />
        </StoreProvider>
      </body>
    </html>
  );
}
