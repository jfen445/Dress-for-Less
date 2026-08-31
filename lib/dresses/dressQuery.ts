// Turns the /dresses URL into the pieces of a GROQ query.
//
// Kept separate from sanity.query.ts, and free of any Sanity client, so the
// rules that decide *which* dresses a page contains can be tested without a
// network. Everything that reaches GROQ from here is either a bound parameter
// or a value checked against a whitelist below — the slice bounds and the
// order/size clauses are interpolated into the query text, so an unchecked
// value would be an injection.

export const CATEGORY_TAGS = [
  "birthday",
  "wedding_guest",
  "cocktail",
  "day_events",
  "ball",
  "graduation",
  "black_tie",
  "festival",
  "mini",
  "midi",
  "maxi",
  "sets",
  "off_the_shoulder",
  "sleeveless",
  "long_sleeve",
  "trending_now",
  "new_arrivals",
  "customer_faves",
  "holiday",
  "race_day",
  "strapless",
] as const;

export const COLOR_TAGS = [
  "black",
  "white",
  "red",
  "orange",
  "yellow",
  "green",
  "blue",
  "purple",
  "pink",
  "grey",
  "brown",
  "multicolour",
] as const;

// Uppercase, so these never collide with the lowercase tag values above and a
// single flat ?filter= list can be sorted back into its three groups.
export const SIZE_VALUES = ["XS", "S", "M", "L", "XL"] as const;

export type SizeValue = (typeof SIZE_VALUES)[number];

export const DEFAULT_PAGE_SIZE = 30;
const MAX_PAGE_SIZE = 60;

// The sort the URL carries, and the GROQ order it means. "popular" is the
// default and was historically a no-op — but offset pagination has no meaning
// without a total order, since an unordered slice can repeat a dress on one
// page and skip it on another. Every option therefore ends in `_id asc` as a
// tiebreaker, so dresses sharing a price or timestamp still have one fixed
// position across pages.
const SORT_ORDERS = {
  popular: "_createdAt desc",
  newest: "_updatedAt desc",
  "price-asc": "price asc",
  "price-desc": "price desc",
} as const;

export type DressSort = keyof typeof SORT_ORDERS;

export const DEFAULT_SORT: DressSort = "popular";

export const SORT_LABELS: Record<DressSort, string> = {
  popular: "Most Popular",
  newest: "Newest",
  "price-asc": "Price: Low to High",
  "price-desc": "Price: High to Low",
};

export type DressQuery = {
  page: number;
  pageSize: number;
  sort: DressSort;
  categories: string[];
  colors: string[];
  sizes: SizeValue[];
};

const isSort = (value: unknown): value is DressSort =>
  typeof value === "string" && value in SORT_ORDERS;

/** Coerce to a whole number within [min, max], falling back on anything else. */
const toBoundedInt = (
  value: unknown,
  { fallback, min, max }: { fallback: number; min: number; max: number },
) => {
  const parsed = Number(Array.isArray(value) ? value[0] : value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(parsed)));
};

const asArray = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.filter((v) => typeof v === "string");
  if (typeof value === "string") return [value];
  return [];
};

/**
 * Normalise raw query params into a query this module is willing to run.
 *
 * `filter` is a flat repeated param mixing all three groups — that shape
 * predates this and is load-bearing, because links like
 * /dresses?filter=customer_faves are already out in the wild. Values are sorted
 * into their group by whitelist membership, and anything unrecognised is
 * dropped rather than passed through.
 */
export function parseDressQuery(
  params: Record<string, string | string[] | undefined>,
): DressQuery {
  const filters = new Set(asArray(params.filter));

  return {
    page: toBoundedInt(params.page, {
      fallback: 1,
      min: 1,
      max: Number.MAX_SAFE_INTEGER,
    }),
    pageSize: toBoundedInt(params.pageSize, {
      fallback: DEFAULT_PAGE_SIZE,
      min: 1,
      max: MAX_PAGE_SIZE,
    }),
    sort: isSort(params.sort) ? params.sort : DEFAULT_SORT,
    categories: CATEGORY_TAGS.filter((tag) => filters.has(tag)),
    colors: COLOR_TAGS.filter((tag) => filters.has(tag)),
    sizes: SIZE_VALUES.filter((size) => filters.has(size)),
  };
}

/** The filter values of a query, flattened back into one ?filter= list. */
export function activeFilterValues(query: DressQuery): string[] {
  return [...query.categories, ...query.colors, ...query.sizes];
}

/**
 * Cache key for a page of results.
 *
 * Canonical by construction: parseDressQuery emits filters in whitelist order,
 * not the order they appeared in the URL, so ?filter=red&filter=ball and
 * ?filter=ball&filter=red are the same key and the second costs nothing.
 */
export const dressQueryKey = (query: DressQuery) =>
  [
    query.sort,
    activeFilterValues(query).join(","),
    query.page,
    query.pageSize,
  ].join("|");

export const orderClauseFor = (sort: DressSort) =>
  `${SORT_ORDERS[sort]}, _id asc`;

/**
 * The GROQ predicate for a query's filters, plus the params it binds.
 *
 * Tag values ride as bound parameters. Size values cannot — they name document
 * fields rather than compare against them — so they are re-derived from
 * SIZE_VALUES rather than taken from the caller's strings.
 *
 * Within a group the options are OR'd, across groups AND'd, which is what the
 * old in-memory filter did.
 */
export function buildDressFilterClause(query: DressQuery): {
  clause: string;
  params: Record<string, string[]>;
} {
  const clauses: string[] = [];
  const params: Record<string, string[]> = {};

  if (query.categories.length > 0) {
    clauses.push("count(tags[@ in $categories]) > 0");
    params.categories = query.categories;
  }

  if (query.colors.length > 0) {
    clauses.push("count(tags[@ in $colors]) > 0");
    params.colors = query.colors;
  }

  if (query.sizes.length > 0) {
    const sizeClause = SIZE_VALUES.filter((size) => query.sizes.includes(size))
      .map((size) => `${size.toLowerCase()} >= 1`)
      .join(" || ");
    clauses.push(`(${sizeClause})`);
  }

  return {
    clause: clauses.length > 0 ? ` && ${clauses.join(" && ")}` : "",
    params,
  };
}

/** Zero-based [start, end) slice bounds for a page. */
export function sliceBoundsFor(query: DressQuery) {
  const start = (query.page - 1) * query.pageSize;
  return { start, end: start + query.pageSize };
}

export const totalPagesFor = (total: number, pageSize: number) =>
  Math.max(1, Math.ceil(total / pageSize));
