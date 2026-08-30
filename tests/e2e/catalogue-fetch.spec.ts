import { expect, test } from "./fixtures/app";
import type { Api } from "./fixtures/app";

// The whole catalogue is ~600 dresses carrying every image URL each. It used to
// be fetched from GlobalContext on mount, so every route in the app paid for it
// whether or not anything on the page read a dress. Nothing customer-facing
// asks for it any more: the listing pages itself, single dresses resolve by id,
// and search runs server-side. Only /admin, which genuinely needs every dress
// in one table, still pulls it.

const catalogueCalls = (api: Api) =>
  api.calls.filter((c) => c.path === "/api/sanity/catalogue");

const searchCalls = (api: Api) =>
  api.calls.filter((c) => c.path === "/api/sanity/search");

// "/" is the one that took longest to free: the hero needed a rotation pool,
// which now comes from a lean query in getStaticProps rather than from all 600.
for (const route of ["/", "/dresses", "/faq", "/login"]) {
  test(`no full-catalogue fetch on ${route}`, async ({ page, api }) => {
    await page.goto(route);
    await page.waitForTimeout(1500);

    expect(catalogueCalls(api)).toEqual([]);
  });
}

test("nav search queries the server instead of the catalogue", async ({
  page,
  api,
}) => {
  await page.goto("/dresses");
  await page.waitForTimeout(500);

  const search = page.getByPlaceholder(/search/i).first();
  await search.fill("gown");
  await expect.poll(() => searchCalls(api).length).toBeGreaterThan(0);

  expect(searchCalls(api).at(-1)!.url.searchParams.get("q")).toBe("gown");
  expect(catalogueCalls(api)).toEqual([]);
});

// The nav fires on every keystroke; without the debounce that is one request
// per character typed.
test("nav search debounces rather than querying per keystroke", async ({
  page,
  api,
}) => {
  await page.goto("/dresses");
  await page.waitForTimeout(500);

  const search = page.getByPlaceholder(/search/i).first();
  for (const term of ["l", "lo", "lon", "long"]) {
    await search.fill(term);
    await page.waitForTimeout(40);
  }

  await expect.poll(() => searchCalls(api).length).toBeGreaterThan(0);
  await page.waitForTimeout(600);

  expect(searchCalls(api).length).toBe(1);
  expect(searchCalls(api)[0].url.searchParams.get("q")).toBe("long");
});
