import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  allowedDevOrigins: ["ccr.caldev.my.id"],
};

export default nextConfig;
