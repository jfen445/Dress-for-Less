import { beforeEach, describe, expect, it, vi } from "vitest";

// The Sanity client throws on construction without a projectId, and these
// assert what GROQ gets built rather than what Sanity returns, so the client is
// replaced with a spy that records the query text.
const fetchSpy = vi.fn(
  async (_query: string, _params?: Record<string, unknown>) => ({
    items: [],
    total: 0,
  }),
);

vi.mock("../../../sanity/sanity.client", () => ({
  default: { fetch: fetchSpy },
}));

const { getDressPage, getHeroPool, searchDresses } = await import(
  "../../../sanity/sanity.query"
);
const { parseDressQuery } = await import("../../../lib/dresses/dressQuery");

const lastQuery = () => fetchSpy.mock.calls.at(-1)![0];
const lastParams = () => fetchSpy.mock.calls.at(-1)![1];

beforeEach(() => {
  fetchSpy.mockClear();
});

describe("getDressPage", () => {
  it("slices the requested page", async () => {
    await getDressPage(parseDressQuery({ page: "3" }));

    expect(lastQuery()).toContain("[60...90]");
  });

  it("orders by the requested sort", async () => {
    await getDressPage(parseDressQuery({ sort: "price-desc" }));

    expect(lastQuery()).toContain("order(price desc, _id asc)");
  });

  // The slice and the count are two separate array expressions in one fetch. A
  // filter applied to only one of them yields a pager sized for the whole
  // catalogue over a page of filtered results — pages that render empty.
  it("applies the filter to the count as well as the slice", async () => {
    await getDressPage(parseDressQuery({ filter: ["ball"] }));

    const query = lastQuery();
    const filtered = query.match(/count\(tags\[@ in \$categories\]\) > 0/g);

    expect(filtered).toHaveLength(2);
    expect(query).toContain("count(*[");
    expect(lastParams()).toEqual({ categories: ["ball"] });
  });

  it("asks for the listing projection, not description or every image", async () => {
    await getDressPage(parseDressQuery({}));

    const query = lastQuery();
    expect(query).toContain('"images": [images[0].asset->url]');
    expect(query).not.toContain("description");
    expect(query).not.toContain("images[].asset->url");
  });

  it("binds tag filters rather than interpolating them into the query", async () => {
    await getDressPage(parseDressQuery({ filter: ["ball"] }));

    // Tags can never inject, because they never reach the query text at all.
    expect(lastQuery()).not.toContain("ball");
    expect(lastParams()).toEqual({ categories: ["ball"] });
  });
});

describe("getHeroPool", () => {
  it("windows from the offset it is given", async () => {
    await getHeroPool(60, 120);

    expect(lastQuery()).toContain("[120...180]");
  });

  // A moving offset is the entire point: a fixed window shows every visitor
  // the same handful of dresses forever.
  it("orders the window so a given offset is stable", async () => {
    await getHeroPool(10, 0);

    expect(lastQuery()).toContain("order(_createdAt desc, _id asc)");
  });
});

describe("searchDresses", () => {
  it("makes each token a prefix pattern and binds it", async () => {
    await searchDresses("long gown");

    expect(lastParams()).toEqual({ pattern: "long* gown*" });
    expect(lastQuery()).toContain("name match $pattern");
    expect(lastQuery()).toContain("description match $pattern");
  });

  it("does not query at all for an empty term", async () => {
    await expect(searchDresses("   ")).resolves.toEqual([]);

    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
