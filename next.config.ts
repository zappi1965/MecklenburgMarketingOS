import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Legacy v103 sources live under /legacy and are reference-only — never built.
  outputFileTracingExcludes: {
    "*": ["./legacy/**/*"],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
};

export default nextConfig;
