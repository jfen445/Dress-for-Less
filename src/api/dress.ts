import api from "./client";
import { activeFilterValues, type DressQuery } from "../../lib/dresses/dressQuery";

/** Every dress at once. Admin screens only — see src/hooks/useAllDresses.ts. */
export async function getCatalogue() {
  return api.get(`/api/sanity/catalogue`);
}

/** Serialise a query into the same ?filter=&sort=&page= shape the URL uses. */
export function dressQueryParams(query: DressQuery) {
  const params = new URLSearchParams();
  activeFilterValues(query).forEach((value) => params.append("filter", value));
  params.set("sort", query.sort);
  params.set("page", String(query.page));
  params.set("pageSize", String(query.pageSize));
  return params;
}

export async function getDressListing(query: DressQuery) {
  return api.get(`/api/sanity/listing?${dressQueryParams(query).toString()}`);
}

export async function getDressById(id: string) {
  return api.get(`/api/sanity/dress/${encodeURIComponent(id)}`);
}

export async function searchDresses(term: string) {
  return api.get(`/api/sanity/search?q=${encodeURIComponent(term)}`);
}
