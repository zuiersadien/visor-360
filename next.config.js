const { withBlitz } = require("@blitzjs/next")

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    typedRoutes: true,
  },
  eslint: {
    // Warning: no linting errors will block production builds
    ignoreDuringBuilds: true,
  },
}

module.exports = withBlitz(nextConfig)
