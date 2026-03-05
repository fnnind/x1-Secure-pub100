import type { NextConfig } from "next";

const securityHeaders = [
  // Prevent the page from being framed (clickjacking)
  { key: "X-Frame-Options", value: "DENY" },
  // Stop browsers from sniffing the MIME type
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Don't send the full URL as referer to third-party origins
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Force HTTPS for 2 years, include subdomains
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  // Disable browser features not needed by the app
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
  // Report-only CSP: collects violations without blocking, so you can tighten
  // incrementally. Promote to Content-Security-Policy once the report stream
  // is clean. Update 'self' image-src if you add further CDN domains.
  {
    key: "Content-Security-Policy-Report-Only",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Next.js requires unsafe-inline/eval in dev; tighten in prod
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://yvbykhjypklymjlrbygw.supabase.co https://content.xeuron.net",
      "font-src 'self' https://fonts.gstatic.com",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.openai.com",
      "frame-ancestors 'none'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "yvbykhjypklymjlrbygw.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "content.xeuron.net",
        pathname: "/**",
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '20mb',
    },
    /** Allow request body up to 20MB when middleware runs (default 10MB). */
    proxyClientMaxBodySize: '20mb',
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
