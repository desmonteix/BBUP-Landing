import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
