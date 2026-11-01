/** @type {import('next').NextConfig} */
const backendUrl =
  process.env.INTERNAL_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://127.0.0.1:8000";

const nextConfig = {
  output: "standalone",
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl.replace(/\/api\/v1\/?$/, "")}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
