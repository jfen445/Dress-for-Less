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
    groq`*[_type == "faq"]{
    _id,
    question,
    answer,
  }`
  );
}

export async function getDress(id: string) {
  return client.fetch(
    groq`*[_type == "dress" && _id == "${id}"][0]{
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
