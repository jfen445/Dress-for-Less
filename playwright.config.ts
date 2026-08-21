import { defineConfig, devices } from "@playwright/test";
import { NEXTAUTH_SECRET } from "./tests/e2e/fixtures/auth";

// The suite is fully offline: every /api/** call is intercepted with page.route
// (see tests/e2e/fixtures), and js.stripe.com is blocked, so no test depends on
// Mongo, Sanity, Stripe, NZ Post or the network. The dev server still needs the
// public env vars present for module-scope calls like loadStripe() not to throw,
// hence the placeholders below.
const PORT = 3100;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: `npx next dev --port ${PORT}`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      // getStaticProps runs inside this server, so its Sanity calls are outside
      // page.route's reach. This preload answers them locally — see the file.
      NODE_OPTIONS: "--require ./tests/e2e/sanity-intercept.cjs",
      NEXT_PUBLIC_STRIPE_PUBLIC_KEY: "pk_test_e2e_placeholder",
      NEXT_PUBLIC_SANITY_PROJECT_ID: "e2e",
      NEXT_PUBLIC_SANITY_DATASET: "test",
      NEXTAUTH_URL: `http://127.0.0.1:${PORT}`,
      // Shared with the tests, which mint session cookies the middleware has to
      // accept — see tests/e2e/fixtures/auth.ts.
      NEXTAUTH_SECRET,
      NEXT_PUBLIC_COMING_SOON: "false",
      // Real environment variables beat .env.local in Next, so these deliberately
      // point the server at nothing: the API routes are all intercepted in the
      // browser, and if one ever escapes interception it must fail loudly rather
      // than reach the real database or Stripe account.
      MONGODB_URI: "mongodb://127.0.0.1:1/e2e-should-never-connect",
      STRIPE_SECRET_KEY: "sk_test_e2e_should_never_be_used",
      STRIPE_WEBHOOK_SECRET: "whsec_e2e",
      RESEND_API_KEY: "re_e2e_should_never_be_used",
      NZPOST_CLIENT_ID: "e2e",
      NZPOST_CLIENT_SECRET: "e2e",
    },
  },
});
