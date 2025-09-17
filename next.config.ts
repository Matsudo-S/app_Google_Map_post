import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://maps.googleapis.com https://maps.gstatic.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://maps.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: https://maps.googleapis.com https://maps.gstatic.com https://streetviewpixels-pa.googleapis.com",
              "connect-src 'self' https://maps.googleapis.com https://maps.gstatic.com https://routes.googleapis.com https://*.googleapis.com https://*.google.com",
              "frame-src 'self' https://maps.google.com",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
