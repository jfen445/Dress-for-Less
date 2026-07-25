import { groq } from "next-sanity";
import client from "./sanity.client";

export async function getAllDressesFromSanity() {
  return client.fetch(
    groq`*[_type == "dress" && defined(images) && defined(price)]{
         _id,
      name,
      description,
      "images": images[].asset->url,
      size,
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
      rating,
      notes,
      _updatedAt
    }`
  );
}

export async function getFaq() {
  return client.fetch(
    groq`*[_type == "faq"] | order(order asc) {
    _id,
    question,
    answer,
    section,
    order,
  }`
  );
}

export async function getDress(id: string) {
  return client.fetch(
    groq`*[_type == "dress" && _id == $id][0]{
      _id,
      name,
      description,
      "images": images[].asset->url,
      size,
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
      rating,
      notes,
      _updatedAt
    }`,
    { id }
  );
}

export async function getAllDressIds() {
  return client.fetch(
    groq`*[_type == "dress" && defined(images) && defined(price)]{
      _id,
      _updatedAt
    }`
  );
}

// Lighter projection for grid/listing views (dress list, home page picks),
// which only ever render name/brand/price/first image/tags/sizes — the full
// getAllDressesFromSanity() projection (description, notes, all images, etc.)
// bloats the getStaticProps payload shipped to every visitor for no benefit
// on these pages. `limit` caps how many docs to fetch (unset = all).
export async function getDressesForListing(limit?: number) {
  const range = limit ? `[0...${limit}]` : "";

  return client.fetch(
    groq`*[_type == "dress" && defined(images) && defined(price)]${range}{
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
    }`
  );
}
