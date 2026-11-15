import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Hero frame sequence: hundreds of small files that only change when the
        // clip is regenerated. Cache for a day and revalidate in the background,
        // rather than a conditional request per frame on every visit.
        source: "/frames/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" }],
      },
    ];
  },
};

export default nextConfig;
