import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: process.env.PUBLIC_BASE_PATH || "",
  /* config options here */
};

export default nextConfig;
