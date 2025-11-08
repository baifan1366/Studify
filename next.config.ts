import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";
import createNextIntlPlugin from "next-intl/plugin";

const withSerwist = withSerwistInit({
  // Note: This is only an example. If you use Pages Router,
  // use something else that works, such as "service-worker/index.ts".
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV !== "production",
  exclude: [
    /OneSignalSDKWorker\.js$/,
    /notification-sound\.mp3$/,
    /manifest\.json$/,
  ], // Exclude files that should be runtime cached instead
  additionalPrecacheEntries: [
    // Explicitly add critical files if needed
  ],
});

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      // Rewrite font requests to bypass locale routing
      {
        source: '/:locale/fonts/:path*',
        destination: '/fonts/:path*',
      },
    ];
  },
  async headers() {
    return [
      // Ensure service workers are served correctly
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
          {
            key: 'Service-Worker-Allowed',
            value: '/',
          },
          {
            key: 'Content-Type',
            value: 'application/javascript; charset=utf-8',
          },
        ],
      },
      {
        source: '/OneSignalSDKWorker.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
          {
            key: 'Service-Worker-Allowed',
            value: '/',
          },
        ],
      },
      {
        source: "/api/:path*",
        headers: [
          {
            key: "Access-Control-Allow-Origin",
            value: "*",
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET, POST, OPTIONS",
          },
          {
            key: "Access-Control-Allow-Headers",
            value: "Content-Type, Authorization",
          },
        ],
      },
      // Add proper headers for font files
      {
        source: "/fonts/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
  images: {
    domains: [
      "api.qrserver.com",
      "lh3.googleusercontent.com", // Google profile images
      "avatars.githubusercontent.com", // GitHub avatars
      "platform-lookaside.fbsbx.com", // Facebook profile images
      "graph.facebook.com", // Facebook profile images alternative
    ],
    unoptimized: true,
  },
};

export default withSerwist(withNextIntl(nextConfig));
