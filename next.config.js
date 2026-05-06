/** @type {import('next').NextConfig} */

/**
 * Development-friendly Content Security Policy.
 *
 * NOTE: 'unsafe-eval' and 'unsafe-inline' are required for Next.js dev mode
 * (HMR / React refresh) and the @uiw/react-md-editor markdown editor used in
 * /admin (it injects inline styles and uses eval-style code paths). For any
 * future production hardening, tighten this by:
 *   - dropping 'unsafe-eval' and 'unsafe-inline' from script-src
 *   - replacing 'unsafe-inline' on style-src with nonces or hashes
 *   - narrowing img-src https: to a specific allowlist
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  "img-src 'self' data: https:",
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
  "font-src 'self' data:",
  "connect-src 'self'",
].join('; ');

const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
  { key: 'Content-Security-Policy', value: contentSecurityPolicy },
];

const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};

module.exports = nextConfig;
