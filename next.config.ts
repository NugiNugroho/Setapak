import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Modul Life berganti nama menjadi Manifestasi; tautan lama tetap berfungsi.
  async redirects() {
    return [{ source: "/life/:path*", destination: "/manifestasi/:path*", permanent: true }];
  },
};

export default nextConfig;
