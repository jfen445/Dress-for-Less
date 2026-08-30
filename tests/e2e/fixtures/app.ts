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

export type StubResult = {
  status?: number;
  json?: unknown;
  // For the responses whose *headers* are the point — the sign-in callback,
  // whose job is to plant the session cookie.
  headers?: Record<string, string>;
};
export type StubContext = { url: URL; body: any; route: Route };
// `unknown` swallows the function arm for inference purposes, so a stub written
// as a function has to annotate its argument — hence StubContext being exported.
export type Stub = unknown | ((ctx: StubContext) => unknown | StubResult);

const isResult = (value: unknown): value is StubResult =>
  typeof value === "object" &&
  value !== null &&
  ("status" in value || "json" in value || "headers" in value) &&
  !Array.isArray(value);

// 1x1 transparent PNG, so dress imagery resolves without leaving the machine.
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

export class Api {
  private stubs = new Map<string, Stub>();
  // Dynamic routes can't be keyed exactly — /api/sanity/dress/[id] is a
  // different path per dress. Prefix stubs are only consulted when no exact
  // stub matches, so the catch-all still fails on anything unmodelled.
  private prefixStubs = new Map<string, Stub>();
  // The full URL is kept alongside the path because some of what the app sends
  // rides in the query string rather than the body — the checkout's price, for
  // one, which is the amount Stripe is about to be told to charge.
  readonly calls: { method: string; path: string; url: URL; body: any }[] = [];
  readonly unstubbed: string[] = [];
  readonly externalRequests: string[] = [];

  /** `set("GET /api/cart", [...])` or a function for dynamic answers. */
  set(key: string, stub: Stub) {
    this.stubs.set(key, stub);
    return this;
  }

  /** `setPrefix("GET /api/sanity/dress/", ...)` for dynamic routes. */
  setPrefix(keyPrefix: string, stub: Stub) {
    this.prefixStubs.set(keyPrefix, stub);
    return this;
  }

  private matchPrefix(key: string) {
    for (const [prefix, stub] of this.prefixStubs) {
      if (key.startsWith(prefix)) return stub;
    }
    return undefined;
  }

  get(key: string) {
    return this.stubs.get(key) ?? this.matchPrefix(key);
  }

  has(key: string) {
    return this.stubs.has(key) || this.matchPrefix(key) !== undefined;
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
    // The whole catalogue. Only /admin asks for this now; a customer-facing
    // page hitting it is a regression, which catalogue-fetch.spec.ts asserts.
    .set("GET /api/sanity/catalogue", data.dressList())
    .set("GET /api/sanity/faq", [])
    // The paged listing, the id cache, and nav search.
    .set("GET /api/sanity/listing", ({ url }: StubContext) =>
      data.dressPage(url),
    )
    .set("GET /api/sanity/search", data.dressList().slice(0, 8))
    .setPrefix("GET /api/sanity/dress/", ({ url }: StubContext) =>
      data.dress({ _id: decodeURIComponent(url.pathname.split("/").pop()!) }),
    )
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
    // Checkout. The intent is created with POST — the price rides in the query
    // string — so a GET stub here would never be hit.
    .set("POST /api/booking", { message: "Booking reserved" })
    .set("POST /api/payment/intent", {
      clientSecret: "pi_e2e_secret_placeholder",
    })
    .set("GET /api/address/search", { addresses: [] })
    // Try-on.
    .set("GET /api/tryOnAvailability", [])
    .set("GET /api/tryOnBooking", { takenSlots: [], availableSlots: [] })
    .set("POST /api/tryOnBooking", { message: "Try-on slot reserved" });

  return api;
}

/**
 * The two answers that make the app treat the visitor as a signed-in customer:
 * NextAuth's session, and the custom MongoDB user record UserContext reads on
 * top of it. Both are needed — a session with no user record leaves userInfo
 * null, which reads as "signed out" everywhere the cart and checkout look.
 */
export function signedIn(api: Api, over: Record<string, unknown> = {}) {
  api.set("GET /api/auth/session", data.session());
  api.set("GET /api/user", data.user(over));
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

  // Sanity's query API is deliberately *not* stubbed for the browser. Checkout
  // used to call getDress() directly from the client, once per cart line; it
  // goes through /api/sanity/dress/[id] now, and nothing else in the app talks
  // to Sanity from a browser. Leaving it unstubbed means a reintroduction is
  // caught by the external-request assertion below rather than passing quietly.
  // (cdn.sanity.io is separate — it serves imagery, handled just above.)

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
    api.calls.push({ method, path: url.pathname, url, body });

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
        headers: value.headers,
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
      expect(
        // js.stripe.com is blocked by the line above, and the checkout page
        // calls loadStripe() at module scope, so its rejection is a property of
        // this harness rather than a fault in the app. It is filtered by exact
        // message so any *other* uncaught error still fails the test. What
        // happens once Stripe.js is present is covered by
        // tests/components/CheckoutPaymentForm.test.tsx.
        pageErrors.filter((error) => !error.includes("Failed to load Stripe.js")),
        "the page threw an uncaught error",
      ).toEqual([]);
    },
    { auto: true },
  ],
});

export { expect } from "@playwright/test";
export { data };
