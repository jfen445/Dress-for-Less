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
  isGlobal?: boolean;
  maxRedemptions?: number;
  redeemedByUserIds?: string[];
};

export type CouponStatus = "Scheduled" | "Active" | "Expired" | "Redeemed";

// Aggregate exhaustion, independent of any one customer: personal coupons
// have a single possible redeemer (isRedeemed); global coupons are exhausted
// once every slot has been claimed.
function isFullyRedeemed(coupon: CouponLike): boolean {
  if (coupon.isGlobal) {
    return (
      (coupon.redeemedByUserIds?.length ?? 0) >= (coupon.maxRedemptions ?? 0)
    );
  }
  return coupon.isRedeemed ?? false;
}

export function getCouponStatus(
  coupon: CouponLike,
  now: string = auckland.now().toISOString(),
): CouponStatus {
  if (isFullyRedeemed(coupon)) return "Redeemed";
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

// Can this specific customer use this specific coupon right now? Personal
// coupons require ownership; global coupons require the customer not have
// already claimed one of the limited slots (a global coupon can be "Active"
// overall while still being off-limits to someone who already redeemed it).
export function isCouponUsableByUser(
  coupon: CouponLike & { userId?: string },
  userId: string,
  now: string = auckland.now().toISOString(),
): boolean {
  if (!isCouponActive(coupon, now)) return false;
  if (coupon.isGlobal) {
    return !(coupon.redeemedByUserIds ?? []).some(
      (id) => id.toString() === userId.toString(),
    );
  }
  return coupon.userId?.toString() === userId.toString();
}
