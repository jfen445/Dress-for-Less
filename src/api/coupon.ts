import api from "./client";

export async function getUserCoupons() {
  return api.get(`/api/coupons`);
}
