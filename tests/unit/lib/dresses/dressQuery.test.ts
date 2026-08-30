import { describe, expect, it } from "vitest";
import {
  DEFAULT_PAGE_SIZE,
  activeFilterValues,
  buildDressFilterClause,
  orderClauseFor,
  parseDressQuery,
  sliceBoundsFor,
  totalPagesFor,
} from "../../../../lib/dresses/dressQuery";

const query = (over: Record<string, string | string[] | undefined> = {}) =>
  parseDressQuery(over);

describe("parseDressQuery", () => {
  it("sorts one flat filter list into its three groups", () => {
    const parsed = query({ filter: ["ball", "red", "M"] });

    expect(parsed.categories).toEqual(["ball"]);
    expect(parsed.colors).toEqual(["red"]);
    expect(parsed.sizes).toEqual(["M"]);
  });

  it("drops filter values that are not on a whitelist", () => {
    const parsed = query({
      filter: ["ball", "not_a_tag", "'] || true || ['", "xl"],
    });

    // "xl" lowercase is a size value only in its uppercase spelling, so it is
    // not a tag and not a size — it must not survive as either.
    expect(activeFilterValues(parsed)).toEqual(["ball"]);
  });

  it("accepts a single filter value that is not an array", () => {
    expect(query({ filter: "customer_faves" }).categories).toEqual([
      "customer_faves",
    ]);
  });

  it("defaults page, pageSize and sort", () => {
    const parsed = query();

    expect(parsed.page).toBe(1);
    expect(parsed.pageSize).toBe(DEFAULT_PAGE_SIZE);
    expect(parsed.sort).toBe("popular");
  });

  it("falls back to the default sort for an unknown one", () => {
    expect(query({ sort: "cheapest" }).sort).toBe("popular");
    expect(query({ sort: "price-asc" }).sort).toBe("price-asc");
  });

  it("clamps a page below one and rejects non-numeric pages", () => {
    expect(query({ page: "0" }).page).toBe(1);
    expect(query({ page: "-4" }).page).toBe(1);
    expect(query({ page: "banana" }).page).toBe(1);
    expect(query({ page: "2.9" }).page).toBe(2);
  });

  it("caps pageSize so a request cannot ask for the whole catalogue", () => {
    expect(query({ pageSize: "100000" }).pageSize).toBe(60);
    expect(query({ pageSize: "0" }).pageSize).toBe(1);
  });
});

describe("buildDressFilterClause", () => {
  it("is empty when nothing is filtered", () => {
    const { clause, params } = buildDressFilterClause(query());

    expect(clause).toBe("");
    expect(params).toEqual({});
  });

  it("binds tag values as parameters rather than inlining them", () => {
    const { clause, params } = buildDressFilterClause(
      query({ filter: ["ball", "red"] }),
    );

    expect(clause).toContain("count(tags[@ in $categories]) > 0");
    expect(clause).toContain("count(tags[@ in $colors]) > 0");
    expect(params).toEqual({ categories: ["ball"], colors: ["red"] });
  });

  it("ORs sizes within the group and ANDs across groups", () => {
    const { clause } = buildDressFilterClause(
      query({ filter: ["ball", "S", "XL"] }),
    );

    expect(clause).toBe(
      " && count(tags[@ in $categories]) > 0 && (s >= 1 || xl >= 1)",
    );
  });

  it("treats a size as available only at stock of one or more", () => {
    const { clause } = buildDressFilterClause(query({ filter: ["M"] }));

    expect(clause).toBe(" && (m >= 1)");
  });

  // Sizes are the one filter that cannot ride as a bound parameter: they name
  // document fields rather than compare against them, so they are interpolated
  // into the query text. The clause must therefore be built from SIZE_VALUES
  // rather than from whatever strings the caller handed over — this bypasses
  // parseDressQuery to prove the second gate holds on its own.
  it("re-derives size fields from the whitelist, not from the caller", () => {
    const { clause } = buildDressFilterClause({
      page: 1,
      pageSize: 30,
      sort: "popular",
      categories: [],
      colors: [],
      sizes: ["M", "xs >= 0 || true" as never],
    });

    expect(clause).toBe(" && (m >= 1)");
    expect(clause).not.toContain("true");
  });
});

describe("orderClauseFor", () => {
  // Offset pagination over an unstable order repeats dresses on one page and
  // skips them on another, so every order ends in a unique tiebreaker.
  it.each(["popular", "newest", "price-asc", "price-desc"] as const)(
    "%s ends in a unique tiebreaker",
    (sort) => {
      expect(orderClauseFor(sort).endsWith(", _id asc")).toBe(true);
    },
  );

  it("maps each sort to its field and direction", () => {
    expect(orderClauseFor("popular")).toBe("_createdAt desc, _id asc");
    expect(orderClauseFor("newest")).toBe("_updatedAt desc, _id asc");
    expect(orderClauseFor("price-asc")).toBe("price asc, _id asc");
    expect(orderClauseFor("price-desc")).toBe("price desc, _id asc");
  });
});

describe("sliceBoundsFor", () => {
  it("starts at zero on page one", () => {
    expect(sliceBoundsFor(query())).toEqual({ start: 0, end: 30 });
  });

  it("advances by a whole page and leaves no gap between pages", () => {
    const second = sliceBoundsFor(query({ page: "2" }));
    const third = sliceBoundsFor(query({ page: "3" }));

    expect(second).toEqual({ start: 30, end: 60 });
    expect(third.start).toBe(second.end);
  });

  it("honours a custom page size", () => {
    expect(sliceBoundsFor(query({ page: "3", pageSize: "10" }))).toEqual({
      start: 20,
      end: 30,
    });
  });
});

describe("totalPagesFor", () => {
  it("rounds a partial last page up", () => {
    expect(totalPagesFor(61, 30)).toBe(3);
    expect(totalPagesFor(60, 30)).toBe(2);
  });

  it("never reports zero pages, so the pager always has a page one", () => {
    expect(totalPagesFor(0, 30)).toBe(1);
  });
});
