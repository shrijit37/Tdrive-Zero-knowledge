/** @type {import('next').NextConfig} */
const nextConfig = {
  // Proxy /api calls to the internal nginx proxy (which routes to FastAPI)
  // Uses Docker service name 'proxy' instead of localhost (which is the web container itself)
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: 'http://proxy:80/api/v1/:path*',
      },
    ]
  },
};

export default nextConfig;
