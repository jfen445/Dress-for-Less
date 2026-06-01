import api from "./client";

export async function getAllFaq() {
  return api.get(`/api/sanity/faq`);
}
