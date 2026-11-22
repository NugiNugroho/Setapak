import type { NextConfig } from "next";
import pkg from "./package.json";

const nextConfig: NextConfig = {
  env: { NEXT_PUBLIC_APP_VERSION: pkg.version },
  // Modul Life berganti nama menjadi Manifestasi; tautan lama tetap berfungsi.
  async redirects() {
    return [{ source: "/life/:path*", destination: "/manifestasi/:path*", permanent: true }];
  },
};

export default nextConfig;
