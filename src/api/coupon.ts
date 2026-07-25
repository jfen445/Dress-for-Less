import api from "./client";

export async function getUserCoupons() {
  return api.get(`/api/coupons`);
}

export async function redeemCouponCode(code: string) {
  return api.post(`/api/coupons/redeem`, { code });
}
