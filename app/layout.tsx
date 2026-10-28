import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { StoreProvider } from "@/lib/store";
import { Shell } from "@/components/Shell";
import { ResetOnQuery } from "@/components/ResetOnQuery";
import { AgentDriver } from "@/components/AgentDriver";
import { StoryPlayer } from "@/components/StoryPlayer";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  display: "swap",
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={jakarta.variable}>
      <body className="flex min-h-dvh flex-col">
        <StoreProvider>
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:font-bold"
          >
            Skip to main content
          </a>
          <Shell>{children}</Shell>
          <ResetOnQuery />
          <AgentDriver />
          <StoryPlayer />
        </StoreProvider>
      </body>
    </html>
  );
}
