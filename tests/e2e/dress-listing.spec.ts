import { data, expect, test } from "./fixtures/app";
import type { Api } from "./fixtures/app";

// /dresses no longer holds the catalogue in memory: page one is server-rendered
// from getStaticProps, and every filter, sort and page change is a fetch against
// /api/sanity/listing, cached per query for the life of the tab. These assert
// the URL is the single source of truth for all three, and that going back to
// something already seen costs nothing.

const listingCalls = (api: Api) =>
  api.calls.filter((c) => c.path === "/api/sanity/listing");

const lastListingCall = (api: Api) => listingCalls(api).at(-1)!;

const openCategoryFilter = async (page: any) => {
  await page.getByRole("button", { name: "Category", exact: true }).click();
};

const activeChip = (page: any, label: string) =>
  page.getByRole("button", { name: `Remove filter for ${label}` });

test("page one comes from the server, with no listing fetch at all", async ({
  page,
  api,
}) => {
  await page.goto("/dresses");

  await expect(page.getByText(data.dress().name).first()).toBeVisible();
  await page.waitForTimeout(800);

  expect(listingCalls(api)).toEqual([]);
});

test("ticking a filter puts it in the URL and fetches exactly one page", async ({
  page,
  api,
}) => {
  await page.goto("/dresses");
  await expect(page.getByText(data.dress().name).first()).toBeVisible();

  await openCategoryFilter(page);
  await page.getByLabel("Ball", { exact: true }).click();

  await expect(page).toHaveURL(/filter=ball/);
  await expect(activeChip(page, "Ball")).toBeVisible();

  await expect.poll(() => listingCalls(api).length).toBe(1);
  expect(lastListingCall(api).url.searchParams.getAll("filter")).toEqual([
    "ball",
  ]);
});

test("going back to a query already seen is served from cache", async ({
  page,
  api,
}) => {
  await page.goto("/dresses");
  await expect(page.getByText(data.dress().name).first()).toBeVisible();

  await openCategoryFilter(page);
  await page.getByLabel("Ball", { exact: true }).click();
  await expect(activeChip(page, "Ball")).toBeVisible();
  await expect.poll(() => listingCalls(api).length).toBe(1);

  // Unticking returns to the default query, which was seeded from the server
  // render — so it was never worth a request in the first place.
  await activeChip(page, "Ball").click();
  await expect(page).not.toHaveURL(/filter=/);
  await page.waitForTimeout(500);
  expect(listingCalls(api)).toHaveLength(1);

  // And re-ticking it hits the page fetched a moment ago.
  await openCategoryFilter(page);
  await page.getByLabel("Ball", { exact: true }).click();
  await expect(activeChip(page, "Ball")).toBeVisible();
  await page.waitForTimeout(500);
  expect(listingCalls(api)).toHaveLength(1);
});

test("paging forward fetches, paging back does not", async ({ page, api }) => {
  await page.goto("/dresses");
  await expect(page.getByText(data.dress().name).first()).toBeVisible();

  await page.getByRole("button", { name: "2", exact: true }).click();
  await expect(page).toHaveURL(/page=2/);
  // The URL changes before the fetch it triggers is recorded, so poll rather
  // than reading the call log on the next line.
  await expect.poll(() => listingCalls(api).length).toBe(1);
  expect(lastListingCall(api).url.searchParams.get("page")).toBe("2");

  await page.getByRole("button", { name: "Prev" }).click();
  await expect(page).not.toHaveURL(/page=/);
  await page.waitForTimeout(500);
  expect(listingCalls(api)).toHaveLength(1);

  await page.getByRole("button", { name: "2", exact: true }).click();
  await expect(page).toHaveURL(/page=2/);
  await page.waitForTimeout(500);
  expect(listingCalls(api)).toHaveLength(1);
});

// Page 4 of the whole catalogue usually doesn't exist once a filter is applied,
// so changing what is being listed has to go back to the start.
test("changing a filter returns to page one", async ({ page, api }) => {
  await page.goto("/dresses?page=2");
  // Wait for the pager to reflect the URL, not merely for the server HTML to
  // paint: the server render is always page one, so clicking before the app has
  // consumed page=2 would test nothing.
  await expect(
    page.getByRole("button", { name: "2", exact: true }),
  ).toHaveAttribute("aria-current", "page");

  await openCategoryFilter(page);
  await page.getByLabel("Ball", { exact: true }).click();
  await expect(activeChip(page, "Ball")).toBeVisible();

  await expect(page).not.toHaveURL(/page=/);
  // Two fetches by now: page two on load, then page one for the filter.
  await expect.poll(() => listingCalls(api).length).toBe(2);
  expect(lastListingCall(api).url.searchParams.get("page")).toBe("1");
});

test("a deep link is honoured on a cold load", async ({ page, api }) => {
  await page.goto("/dresses?filter=customer_faves&sort=price-asc&page=2");

  await expect(activeChip(page, "Customer Faves")).toBeVisible();
  await page.waitForTimeout(500);

  await expect.poll(() => listingCalls(api).length).toBe(1);
  const params = lastListingCall(api).url.searchParams;
  expect(params.getAll("filter")).toEqual(["customer_faves"]);
  expect(params.get("sort")).toBe("price-asc");
  expect(params.get("page")).toBe("2");
});

// The sort used to live in component state that the filter effect rebuilt from
// scratch, so choosing "Price: Low to High" and then ticking a filter silently
// reverted to the default order.
test("the chosen sort survives a filter change", async ({ page, api }) => {
  await page.goto("/dresses");
  await expect(page.getByText(data.dress().name).first()).toBeVisible();

  await page.getByRole("button", { name: "Sort" }).click();
  await page.getByText("Price: Low to High").click();
  await expect(page).toHaveURL(/sort=price-asc/);

  await openCategoryFilter(page);
  await page.getByLabel("Ball", { exact: true }).click();
  await expect(activeChip(page, "Ball")).toBeVisible();

  await expect(page).toHaveURL(/sort=price-asc/);
  // One fetch for the sort, a second for the filter on top of it.
  await expect.poll(() => listingCalls(api).length).toBe(2);
  const params = lastListingCall(api).url.searchParams;
  expect(params.get("sort")).toBe("price-asc");
  expect(params.getAll("filter")).toEqual(["ball"]);
});

// Filters were applied from the URL exactly once, behind a latch, so the back
// button changed the address bar and nothing else.
test("back and forward move between filter states", async ({ page }) => {
  await page.goto("/dresses");
  await expect(page.getByText(data.dress().name).first()).toBeVisible();

  await openCategoryFilter(page);
  await page.getByLabel("Ball", { exact: true }).click();
  await expect(activeChip(page, "Ball")).toBeVisible();

  await page.goBack();
  await expect(activeChip(page, "Ball")).toHaveCount(0);

  await page.goForward();
  await expect(activeChip(page, "Ball")).toBeVisible();
});

// The cache only pays off if clicking a dress doesn't tear the page down. The
// cards used to be plain <a href>, which reloaded the whole app every time.
test("a dress card navigates without reloading the app", async ({ page }) => {
  await page.goto("/dresses");
  await expect(page.getByText(data.dress().name).first()).toBeVisible();

  await page.evaluate(() => {
    (window as any).__survivedNavigation = true;
  });

  await page.getByRole("link", { name: data.dress().name }).first().click();
  await expect(page).toHaveURL(/\/dresses\/products\//);

  expect(
    await page.evaluate(() => (window as any).__survivedNavigation),
  ).toBe(true);
});
