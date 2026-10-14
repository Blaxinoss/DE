import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["@google-cloud/text-to-speech"],
};
export default nextConfig;
