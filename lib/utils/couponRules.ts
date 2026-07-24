import { auckland } from "./timezone";
import { CouponType } from "../../common/enums/CouponType";

export type DiscountableCoupon = {
  discountAmount: number;
  discountType: CouponType;
};

// Each coupon is computed independently against `subtotal` (dress items
// only, never shipping) and summed — coupons don't compound/stack sequentially.
export function calculateCouponDiscount(
  coupons: DiscountableCoupon[],
  subtotal: number,
): number {
  return coupons.reduce((sum, c) => {
    if (c.discountType === CouponType.Percentage) {
      return sum + (subtotal * c.discountAmount) / 100;
    }
    return sum + c.discountAmount;
  }, 0);
}

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
