// Preloaded into the E2E dev server via NODE_OPTIONS=--require.
//
// Three pages (/, /dresses, /dresses/products/[id]) get their data from
// getStaticProps, which runs inside the Next server. Playwright's page.route
// only intercepts the *browser*, so those calls would go straight out to
// Sanity's real API — and the product page returns notFound when they come back
// empty, so the main journey would 404 rather than degrade.
//
// This patches https.request at the Node level so anything addressed to
// sanity.io is answered locally from the same fixture the browser stubs use.
// It is test-only: nothing in the application knows it exists, and it is loaded
// solely by playwright.config.ts.
//
// It must be required before @sanity/client's transport (get-it, and
// follow-redirects underneath it) captures the https module — which --require
// guarantees, since it runs before any application module is loaded.

const https = require("https");
const { PassThrough } = require("stream");
const { EventEmitter } = require("events");
const dress = require("./fixtures/dress.json");

const originalRequest = https.request;
const originalGet = https.get;

function resolveUrl(args) {
  const [first, second] = args;

  if (typeof first === "string") return new URL(first);
  if (first instanceof URL) return first;

  const options = first && typeof first === "object" ? first : second;
  if (!options) return null;

  const host = options.hostname || options.host;
  if (!host) return null;

  try {
    return new URL(`https://${host}${options.path || "/"}`);
  } catch {
    return null;
  }
}

// Sanity answers a GROQ query with { result, ms, query }. Which shape `result`
// takes is decided from the query text: getDress selects a single document,
// getFaq selects the faq type, and everything else is a dress listing.
function resultFor(url) {
  const query = url.searchParams.get("query") || "";

  if (query.includes('_type == "faq"')) return [];

  if (query.includes("_id == $id")) {
    const requested = (url.searchParams.get("$id") || "").replace(/^"|"$/g, "");
    // Echo the id that was asked for, so any dress id resolves rather than 404s.
    return { ...dress, _id: requested || dress._id };
  }

  // getDressPage asks for the slice and the count in one object projection.
  // The slice is honoured so a broken pager can't pass; filtering is not
  // emulated, since that is Sanity's job and is proven at the clause level in
  // tests/unit/lib/dresses/dressQuery.test.ts instead.
  if (query.includes('"total": count(')) {
    return { items: sliceOf(query, listing()), total: LISTING_SIZE };
  }

  if (query.includes("match $pattern")) return sliceOf(query, listing());

  if (query.trimStart().startsWith("count(")) return LISTING_SIZE;

  // The hero pool, distinguishable because it is the one dress projection with
  // no price — it needs an id and one image and nothing else. Its slice must be
  // honoured too: the point of the hero query is that the window moves.
  if (
    query.includes("[images[0].asset->url]") &&
    !query.includes("price")
  ) {
    return sliceOf(query, listing());
  }

  // The home page's hero indexes dresses[0..6] unguarded, so a listing has to
  // return at least seven or the page throws while rendering.
  if (query.includes('_type == "dress"')) return listing();

  return [];
}

// Applies a GROQ [start...end] slice from the query text to a fixture array,
// wrapping so an offset past the end still yields dresses rather than nothing.
function sliceOf(query, items) {
  const match = query.match(/\[(\d+)\.\.\.(\d+)\]/);
  if (!match) return items;

  const start = Number(match[1]) % items.length;
  const end = start + (Number(match[2]) - Number(match[1]));

  return Array.from({ length: Math.min(end - start, items.length) }, (_, i) =>
    items[(start + i) % items.length],
  );
}

// Bigger than one page (30), so pagination is exercised rather than assumed.
const LISTING_SIZE = 40;

// Each entry needs its own image URL: the hero picks seven dresses with
// *distinct* first images (getDressesWithUniqueImages), so a listing that
// repeats one image collapses to a single dress and the hero indexes past the
// end of it.
function listing() {
  return Array.from({ length: LISTING_SIZE }, (_, index) =>
    index === 0
      ? dress
      : {
          ...dress,
          _id: `${dress._id}-${index}`,
          name: `${dress.name} ${index}`,
          images: [`https://cdn.sanity.io/images/e2e/test/gown-${index}.jpg`],
        },
  );
}

function fakeResponse(payload) {
  const res = new PassThrough();
  res.statusCode = 200;
  res.statusMessage = "OK";
  res.headers = { "content-type": "application/json; charset=utf-8" };
  res.rawHeaders = ["content-type", "application/json; charset=utf-8"];

  process.nextTick(() => res.end(JSON.stringify(payload)));

  return res;
}

function fakeRequest(url, callback) {
  const req = new EventEmitter();

  req.end = () => req;
  req.write = () => true;
  req.setHeader = () => req;
  req.getHeader = () => undefined;
  req.removeHeader = () => req;
  req.setTimeout = () => req;
  req.setNoDelay = () => req;
  req.setSocketKeepAlive = () => req;
  req.flushHeaders = () => req;
  req.abort = () => {};
  req.destroy = () => {};

  process.nextTick(() => {
    const res = fakeResponse({
      result: resultFor(url),
      ms: 0,
      query: url.searchParams.get("query") || "",
    });

    if (typeof callback === "function") callback(res);
    req.emit("response", res);
  });

  return req;
}

function patched(original) {
  return function (...args) {
    const url = resolveUrl(args);

    if (!url || !url.hostname.endsWith("sanity.io")) {
      return original.apply(this, args);
    }

    const callback = args.find((arg) => typeof arg === "function");
    return fakeRequest(url, callback);
  };
}

https.request = patched(originalRequest);
https.get = function (...args) {
  const req = https.request(...args);
  req.end();
  return req;
};

console.log("[e2e] Sanity requests are intercepted locally");
