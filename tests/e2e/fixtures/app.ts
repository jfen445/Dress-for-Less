import { test as base, expect, type Page, type Route } from "@playwright/test";
import * as data from "./data";

// Every browser test runs fully offline. Requests to the app's own origin are
// served by the dev server; every /api/** call is answered from the stub table
// below; everything else is refused.
//
// The load-bearing part is the catch-all: an /api/** path with no stub answers
// 501 and is recorded, and the fixture fails the test at the end. Without that
// a journey could quietly pass while the app talked to something we never
// modelled — which is the standing risk of stubbing at the network boundary.

export type StubResult = { status?: number; json?: unknown };
export type Stub =
  | unknown
  | ((ctx: { url: URL; body: any; route: Route }) => unknown | StubResult);

const isResult = (value: unknown): value is StubResult =>
  typeof value === "object" &&
  value !== null &&
  ("status" in value || "json" in value) &&
  !Array.isArray(value);

// 1x1 transparent PNG, so dress imagery resolves without leaving the machine.
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

export class Api {
  private stubs = new Map<string, Stub>();
  readonly calls: { method: string; path: string; body: any }[] = [];
  readonly unstubbed: string[] = [];
  readonly externalRequests: string[] = [];

  /** `set("GET /api/cart", [...])` or a function for dynamic answers. */
  set(key: string, stub: Stub) {
    this.stubs.set(key, stub);
    return this;
  }

  get(key: string) {
    return this.stubs.get(key);
  }

  has(key: string) {
    return this.stubs.has(key);
  }

  called(method: string, path: string) {
    return this.calls.filter((c) => c.method === method && c.path === path);
  }
}

function defaults(api: Api) {
  api
    // NextAuth's client polls these on every page. An empty session object is
    // how NextAuth represents "signed out".
    .set("GET /api/auth/session", {})
    .set("GET /api/auth/csrf", { csrfToken: "e2e-csrf" })
    .set("GET /api/auth/providers", {})
    .set("GET /api/auth/_log", {})
    .set("POST /api/auth/_log", {})
    // GlobalContext, on every page.
    .set("GET /api/sanity/dresses", data.dressList())
    .set("GET /api/sanity/faq", [])
    // UserContext / CartContext.
    // What the real route returns to a caller with no session (pages/api/user.ts
    // answers 401 before it ever looks at the email). Signed-in tests override it.
    .set("GET /api/user", { status: 401, json: { error: "Unauthorized" } })
    .set("GET /api/cart", [])
    .set("POST /api/cart", { message: "Added to cart" })
    .set("DELETE /api/cart", { message: "Removed" })
    .set("POST /api/syncCart", { message: "Synced" })
    // Product page: availability and blockouts.
    .set("GET /api/booking", [])
    .set("GET /api/blockouts", [])
    .set("GET /api/coupons", [])
    // Checkout.
    .set("POST /api/booking", { message: "Booking reserved" })
    .set("GET /api/payment/intent", {
      clientSecret: "pi_e2e_secret_placeholder",
    })
    .set("GET /api/address/search", { addresses: [] })
    // Try-on.
    .set("GET /api/tryOnAvailability", [])
    .set("GET /api/tryOnBooking", { takenSlots: [], availableSlots: [] })
    .set("POST /api/tryOnBooking", { message: "Try-on slot reserved" });

  return api;
}

async function install(page: Page, api: Api) {
  // Registered first so the more specific routes below take precedence —
  // Playwright uses the most recently registered matching route.
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.hostname === "127.0.0.1" || url.hostname === "localhost") {
      return route.continue();
    }
    api.externalRequests.push(`${url.origin}${url.pathname}`);
    return route.abort();
  });

  await page.route("https://cdn.sanity.io/**", (route) =>
    route.fulfill({ status: 200, contentType: "image/png", body: PNG }),
  );

  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();
    const key = `${method} ${url.pathname}`;

    let body: any;
    try {
      body = request.postDataJSON();
    } catch {
      body = request.postData();
    }
    api.calls.push({ method, path: url.pathname, body });

    if (!api.has(key)) {
      api.unstubbed.push(key);
      return route.fulfill({
        status: 501,
        contentType: "application/json",
        body: JSON.stringify({ message: `No stub for ${key}` }),
      });
    }

    const stub = api.get(key)!;
    const value =
      typeof stub === "function" ? await stub({ url, body, route }) : stub;

    if (isResult(value)) {
      return route.fulfill({
        status: value.status ?? 200,
        contentType: "application/json",
        body: JSON.stringify(value.json ?? {}),
      });
    }

    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(value ?? {}),
    });
  });
}

export const test = base.extend<{ api: Api }>({
  // `auto` is load-bearing, not tidiness. Playwright fixtures are lazy, so a
  // test written as ({ page }) would otherwise skip this entirely: no stubs, no
  // pinned clock, and a calendar showing the real current month — where an
  // assertion that a date is disabled passes because the date is in the past
  // rather than because the cutoff logic works.
  api: [
    async ({ page }, use) => {
      const api = defaults(new Api());
      await install(page, api);

      // Next's dev overlay renders into <nextjs-portal>, which sits above the
      // page and swallows clicks aimed at anything underneath it. Hidden rather
      // than worked around with force-clicks, so actionability checks stay
      // meaningful — and paired with the pageerror guard below so hiding it
      // can't conceal a real fault.
      await page.addInitScript(() => {
        const hide = () => {
          const style = document.createElement("style");
          style.textContent = "nextjs-portal { display: none !important; }";
          document.head?.appendChild(style);
        };
        if (document.head) hide();
        else document.addEventListener("DOMContentLoaded", hide);
      });

      // Deliberately NOT pinned with page.clock: that fixes the browser's clock
      // only, so a server-rendered date-dependent view (the Calendar's month
      // header) renders one month on the server and another in the browser, and
      // React tears the whole root down as a hydration mismatch. Dates are
      // derived from the real today instead — see fixtures/data.ts.
      const pageErrors: string[] = [];
      page.on("pageerror", (error) => pageErrors.push(error.message));

      await use(api);

      expect(
        api.unstubbed,
        "the app called an API path with no stub — the journey is not fully modelled",
      ).toEqual([]);
      expect(
        api.externalRequests.filter((r) => !r.includes("js.stripe.com")),
        "the app tried to reach an external service",
      ).toEqual([]);
      expect(pageErrors, "the page threw an uncaught error").toEqual([]);
    },
    { auto: true },
  ],
});

export { expect } from "@playwright/test";
export { data };
