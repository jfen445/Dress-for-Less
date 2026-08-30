import { groq } from "next-sanity";
import client from "./sanity.client";
import {
  buildDressFilterClause,
  orderClauseFor,
  sliceBoundsFor,
  type DressQuery,
} from "../lib/dresses/dressQuery";

// Every dress query starts from the same predicate: a dress without images or a
// price cannot be rendered or sold, so it is not part of the catalogue.
const DRESS_BASE = `_type == "dress" && defined(images) && defined(price)`;

// What grid/listing views render — name/brand/price/first image/tags/sizes. Not
// enough for the cart or the product page, which read description, length,
// stretch and rrp; those go through getDress instead.
const LISTING_PROJECTION = `{
  _id,
  name,
  brand,
  price,
  "images": [images[0].asset->url],
  xs,
  s,
  m,
  l,
  xl,
  tags,
  _updatedAt
}`;

const FULL_PROJECTION = `{
  _id,
  name,
  description,
  "images": images[].asset->url,
  recommendedSize,
  length,
  stretch,
  brand,
  price,
  rrp,
  tags,
  xs,
  s,
  m,
  l,
  xl,
  condition,
  notes,
  _updatedAt
}`;

// The entire catalogue in one response, for the admin tables and pickers — the
// only screens that need every dress at once. Deliberately the *listing*
// projection: admin reads name, brand, price, first image and the size counts
// and nothing else, so the description, notes and every image URL this used to
// carry were pure weight on the one screen that downloads all ~600 rows.
export async function getCatalogue() {
  return client.fetch(groq`*[${DRESS_BASE}]${LISTING_PROJECTION}`);
}

export async function getFaq() {
  return client.fetch(
    groq`*[_type == "faq"] | order(order asc) {
    _id,
    question,
    answer,
    section,
    order,
  }`,
  );
}

export async function getDress(id: string) {
  return client.fetch(
    groq`*[_type == "dress" && _id == $id][0]${FULL_PROJECTION}`,
    { id },
  );
}

// Just enough to price a booking and check per-size stock. The callers that use
// this run per booking item on the server, and were pulling every image URL and
// the full description to read two numbers.
export async function getDressPricing(id: string) {
  return client.fetch(
    groq`*[_type == "dress" && _id == $id][0]{
      _id,
      price,
      xs,
      s,
      m,
      l,
      xl
    }`,
    { id },
  );
}

export async function getAllDressIds() {
  return client.fetch(
    groq`*[${DRESS_BASE}]{
      _id,
      _updatedAt
    }`,
  );
}

/**
 * One page of the catalogue, with the count needed to render the pager.
 *
 * Slice and count come back from a single fetch: asking separately would let
 * the two disagree if a dress were published between them, which shows up as a
 * pager offering a page that renders empty.
 *
 * The interpolated parts — order clause, slice bounds, size clauses — are all
 * derived from whitelists in lib/dresses/dressQuery.ts, never from raw input.
 */
export async function getDressPage(query: DressQuery) {
  const { clause, params } = buildDressFilterClause(query);
  const { start, end } = sliceBoundsFor(query);
  const filtered = `${DRESS_BASE}${clause}`;

  return client.fetch(
    groq`{
      "items": *[${filtered}] | order(${orderClauseFor(query.sort)})[${start}...${end}]${LISTING_PROJECTION},
      "total": count(*[${filtered}])
    }`,
    params,
  ) as Promise<{ items: unknown[]; total: number }>;
}

export async function getDressCount() {
  return client.fetch(groq`count(*[${DRESS_BASE}])`) as Promise<number>;
}

/**
 * A window of the catalogue for the home page's hero rotation — ids and one
 * image each, nothing more.
 *
 * The window is ordered so a given offset is stable, and the *caller* picks the
 * offset. That is the whole point: the hero used to draw from a fixed
 * unordered [0...40], so without a moving offset every visitor sees the same
 * few dresses forever.
 */
export async function getHeroPool(size: number, offset: number = 0) {
  const start = Math.max(0, Math.trunc(offset));
  const end = start + Math.max(1, Math.trunc(size));

  return client.fetch(
    groq`*[${DRESS_BASE}] | order(_createdAt desc, _id asc)[${start}...${end}]{
      _id,
      name,
      "images": [images[0].asset->url]
    }`,
  );
}

/**
 * Typeahead search. GROQ's `match` is token-prefix based, so "gow" finds
 * "gown" but "own" no longer does — the in-memory version this replaces used a
 * substring test, which cannot be pushed into a query.
 */
export async function searchDresses(term: string, limit: number = 8) {
  const tokens = term.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return [];

  const pattern = tokens.map((token) => `${token}*`).join(" ");
  const end = Math.max(1, Math.trunc(limit));

  return client.fetch(
    groq`*[${DRESS_BASE} && (name match $pattern || brand match $pattern || description match $pattern)]
      | order(_createdAt desc, _id asc)[0...${end}]${LISTING_PROJECTION}`,
    { pattern },
  );
}
