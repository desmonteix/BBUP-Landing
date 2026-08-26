import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pins the workspace root to this project. Without this, Next.js
  // auto-detects a root by walking up for the nearest lockfile and finds
  // an unrelated one in a parent directory outside this repo, which just
  // produces a harmless but noisy build warning.
  outputFileTracingRoot: __dirname,
  images: {
    // Local SVG placeholders (public/images/placeholders/*.svg) are served
    // through next/image with dimensions declared per the asset checklist.
    // Real photos later can be raster (jpg/webp) with no config change needed.
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
};

export default nextConfig;
