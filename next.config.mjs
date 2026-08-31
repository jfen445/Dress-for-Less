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
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.sanity.io",
        pathname: "/images/**",
      },
    ],
    // These bound what one crawl of the catalogue can cost. On 2026-08-21 a bot
    // walked the product URLs in sitemap.xml and ran /_next/image to 46k
    // requests in a day. Capping source width at the Sanity layer
    // (`sizedImageUrl`) was already live and didn't help: it governs what is
    // fetched, not how many variants Next offers or how often they re-optimise.

    // Default is 60s, so an optimised image is re-paid for a minute after it is
    // made. A dress edit publishes a new asset URL, so it misses anyway.
    minimumCacheTTL: 2678400, // 31 days

    // Both lists are the candidate widths in every srcset, and a crawler pays
    // for all of them rather than the one a browser picks. Defaults offer 16 and
    // reach 3840px; the widest source we ever request is 1400 (ImageSelector).
    deviceSizes: [640, 828, 1080, 1400],

    // Fixed-width images (`sizes="96px"`) get the whole combined list unfiltered,
    // so thumbnails are the worst case. 192 is the exact 2x of the 96px product
    // thumbs, which otherwise round up to 256.
    imageSizes: [64, 96, 128, 192, 256, 384],

    // Explicit so adding AVIF is a decision, not an accident — a second format
    // doubles transformations.
    formats: ["image/webp"],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
