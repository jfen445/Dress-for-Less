// Baseline security headers applied to every response. A Content-Security-Policy
// is intentionally omitted here: a correct policy has to allow list Stripe,
// Sanity, Google auth/fonts and the app's own inline styles, and shipping a
// wrong one silently breaks checkout — add it as a tested follow-up.
const securityHeaders = [
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  crossOrigin: "anonymous",
  transpilePackages: [
    "@mui/x-scheduler",
    "@mui/x-scheduler-internals",
    "@atlaskit/pragmatic-drag-and-drop",
    "@atlaskit/pragmatic-drag-and-drop-auto-scroll",
  ],
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
