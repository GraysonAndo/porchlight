import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Only bundle the icons that are used.
  experimental: {
    optimizePackageImports: ["@phosphor-icons/react"],
  },
  // Old links from earlier versions keep working.
  async redirects() {
    return [
      { source: "/triage", destination: "/tenant", permanent: false },
      { source: "/tenant/request", destination: "/tenant", permanent: false },
      { source: "/tenant/safety", destination: "/tenant", permanent: false },
      { source: "/tenant/label", destination: "/tenant", permanent: false },
      { source: "/tenant/status", destination: "/tenant", permanent: false },
      // The label step is gone: the home record already knows every model.
      { source: "/label", destination: "/owner/record", permanent: false },
      { source: "/owner/label", destination: "/owner/record", permanent: false },
      // The old demo consoles are gone. The agent panel on the main screens replaces them.
      { source: "/live", destination: "/", permanent: false },
      { source: "/sms", destination: "/", permanent: false },
      { source: "/record", destination: "/owner/record", permanent: false },
      { source: "/quote", destination: "/owner/quote", permanent: false },
      { source: "/decide", destination: "/owner/decide", permanent: false },
      { source: "/approve", destination: "/owner/book", permanent: false },
      { source: "/forecast", destination: "/owner/forecast", permanent: false },
      { source: "/rent", destination: "/owner/rent", permanent: false },
      // Routes people expect, sent to the page that does the job.
      { source: "/login", destination: "/", permanent: false },
      { source: "/tenant/requests/new", destination: "/tenant", permanent: false },
      { source: "/tenant/requests", destination: "/tenant", permanent: false },
      { source: "/requests/new", destination: "/tenant", permanent: false },
      { source: "/owner/requests", destination: "/owner/request", permanent: false },
      { source: "/faq", destination: "/about#faq", permanent: false },
      { source: "/contact", destination: "/about#contact", permanent: false },
    ];
  },
  // Stop `next dev` from generating AGENTS.md in the repo.
  agentRules: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
