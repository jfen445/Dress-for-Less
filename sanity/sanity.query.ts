import { groq } from "next-sanity";
import client from "./sanity.client";

export async function getProfile() {
  return client.fetch(
    groq`*[_type == "profile"]{
      _id,
      fullName,
      headline,
      profileImage {alt, "image": asset->url},
      shortBio,
      location,
      fullBio,
      email,
      "resumeURL": resumeURL.asset->url,
      socialLinks,
      skills
    }`
  );
}

export async function getAllDresses() {
  return client.fetch(
    groq`*[_type == "dress"]{
      _id,
      name,
      description,
      "images": images[].asset->url,
      size,
      tags,
      price,
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
      notes
    }`
  );
}

export async function getRecentDress() {
  return client.fetch(
    groq`*[_type == "dress" && images != null && count(images[].asset->url) > 0] 
    | order(_createdAt asc)[0..6] 
    {"images": images[].asset->url}`
  );
}

export async function getFavouriteDress() {
  return client.fetch(
    groq`*[_type == "dress" && images != null && count(images[].asset->url) > 0] 
    | order(_createdAt desc)[0..2] 
    {
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
      notes
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
