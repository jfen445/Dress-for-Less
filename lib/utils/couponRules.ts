import { auckland } from "./timezone";

export type CouponLike = {
  startDate: string;
  expiryDate: string;
  isRedeemed?: boolean;
};

export type CouponStatus = "Scheduled" | "Active" | "Expired" | "Redeemed";

export function getCouponStatus(
  coupon: CouponLike,
  now: string = auckland.now().toISOString(),
): CouponStatus {
  if (coupon.isRedeemed) return "Redeemed";
  if (coupon.expiryDate < now) return "Expired";
  if (coupon.startDate > now) return "Scheduled";
  return "Active";
}

export function isCouponActive(
  coupon: CouponLike,
  now: string = auckland.now().toISOString(),
): boolean {
  return getCouponStatus(coupon, now) === "Active";
}
