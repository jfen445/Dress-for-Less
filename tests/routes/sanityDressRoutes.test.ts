import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMocks, type RequestMethod } from "node-mocks-http";
import type { NextApiRequest, NextApiResponse } from "next";

// These routes are the only thing standing between a URL and a GROQ query, so
// what is under test is the translation and the failure handling — not Sanity.
const getDressPage = vi.fn(async () => ({ items: [{ _id: "d1" }], total: 41 }));
const getDress = vi.fn(async (_id: string) => ({ _id: "d1", name: "Gown" }));
const searchDresses = vi.fn(async (_term: string) => [{ _id: "d1" }]);

vi.mock("../../sanity/sanity.query", () => ({
  getDressPage,
  getDress,
  searchDresses,
}));

const listing = (await import("../../pages/api/sanity/listing")).default;
const dressById = (await import("../../pages/api/sanity/dress/[id]")).default;
const search = (await import("../../pages/api/sanity/search")).default;

type Handler = (
  req: NextApiRequest,
  res: NextApiResponse,
) => unknown | Promise<unknown>;

const call = async (
  handler: Handler,
  { method = "GET", query = {} }: { method?: RequestMethod; query?: any } = {},
) => {
  const { req, res } = createMocks({ method, query });
  await handler(req as unknown as NextApiRequest, res as unknown as NextApiResponse);
  return res;
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/sanity/listing", () => {
  it("translates the URL into a parsed query", async () => {
    await call(listing, {
      query: { page: "3", sort: "price-asc", filter: ["ball", "M"] },
    });

    expect(getDressPage).toHaveBeenCalledWith(
      expect.objectContaining({
        page: 3,
        sort: "price-asc",
        categories: ["ball"],
        sizes: ["M"],
      }),
    );
  });

  it("returns the page alongside the total the pager needs", async () => {
    const res = await call(listing, { query: { page: "2" } });

    expect(res._getStatusCode()).toBe(200);
    expect(res._getJSONData()).toEqual({
      items: [{ _id: "d1" }],
      total: 41,
      page: 2,
      pageSize: 30,
    });
  });

  it("is cacheable, so each filter combination is fetched once per hour", async () => {
    const res = await call(listing);

    expect(res.getHeader("Cache-Control")).toContain("s-maxage=3600");
  });

  // A bare throw here 500s with a stack, and — worse — an errored response
  // would still carry the cache header above and be served for an hour.
  it("does not cache an upstream failure", async () => {
    getDressPage.mockRejectedValueOnce(new Error("sanity is down"));

    const res = await call(listing);

    expect(res._getStatusCode()).toBe(502);
    expect(res.getHeader("Cache-Control")).toBeUndefined();
  });

  it("refuses a non-GET", async () => {
    const res = await call(listing, { method: "POST" });

    expect(res._getStatusCode()).toBe(405);
    expect(getDressPage).not.toHaveBeenCalled();
  });
});

describe("GET /api/sanity/dress/[id]", () => {
  it("returns the dress it was asked for", async () => {
    const res = await call(dressById, { query: { id: "dress-1" } });

    expect(getDress).toHaveBeenCalledWith("dress-1");
    expect(res._getStatusCode()).toBe(200);
  });

  it("404s a dress that does not exist, rather than caching a null", async () => {
    getDress.mockResolvedValueOnce(null as any);

    const res = await call(dressById, { query: { id: "ghost" } });

    expect(res._getStatusCode()).toBe(404);
    expect(res.getHeader("Cache-Control")).toBeUndefined();
  });

  it("400s a missing id without asking Sanity", async () => {
    const res = await call(dressById, { query: {} });

    expect(res._getStatusCode()).toBe(400);
    expect(getDress).not.toHaveBeenCalled();
  });
});

describe("GET /api/sanity/search", () => {
  it("passes the term through", async () => {
    await call(search, { query: { q: "long gown" } });

    expect(searchDresses).toHaveBeenCalledWith("long gown");
  });

  // The nav fires on keystrokes, so a blank or whitespace term is the common
  // case, not an edge case — it must not become a query.
  it("answers an empty term with an empty list and no query", async () => {
    const res = await call(search, { query: { q: "   " } });

    expect(res._getStatusCode()).toBe(200);
    expect(res._getJSONData()).toEqual([]);
    expect(searchDresses).not.toHaveBeenCalled();
  });

  it("caches far more briefly than the listing", async () => {
    const res = await call(search, { query: { q: "gown" } });

    expect(res.getHeader("Cache-Control")).toContain("s-maxage=300");
  });
});
