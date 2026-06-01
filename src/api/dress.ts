import api from "./client";

export async function getAllDresses() {
  return api.get(`/api/sanity/dresses`);
}
