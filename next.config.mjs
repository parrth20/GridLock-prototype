/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  images: {
    unoptimized: true,
  },
  // Ship the real Bengaluru aggregates inside the dataset serverless function
  // so "Use the real Bengaluru data" works on Vercel.
  outputFileTracingIncludes: {
    "/api/dataset": ["./data/processed/parking-summary.json"],
  },
}

export default nextConfig
