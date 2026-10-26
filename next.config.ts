import type { NextConfig } from "next";

/**
 * `standalone` is for Docker / EC2 / Elastic Beanstalk.
 * AWS Amplify Hosting SSR breaks with standalone and often shows Next.js 404.
 * Set STANDALONE=1 (or DOCKER=1) only for container builds.
 */
const useStandalone =
  process.env.STANDALONE === "1" ||
  process.env.DOCKER === "1" ||
  process.env.OUTPUT_STANDALONE === "1";

const nextConfig: NextConfig = {
  ...(useStandalone ? { output: "standalone" as const } : {}),
  serverExternalPackages: [
    "pdf-parse",
    "tesseract.js",
    "@xenova/transformers",
    "word-extractor",
    "mammoth",
  ],
  experimental: {
    serverActions: {
      bodySizeLimit: "16mb",
    },
  },
};

export default nextConfig;
