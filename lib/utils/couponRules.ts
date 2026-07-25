import { auckland, dayjs } from "./timezone";
import { CouponType } from "../../common/enums/CouponType";
import { CouponStatus } from "../../common/enums/CouponStatus";

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
  if (isFullyRedeemed(coupon)) return CouponStatus.Redeemed;
  if (coupon.expiryDate < now) return CouponStatus.Expired;
  if (coupon.startDate > now) return CouponStatus.Scheduled;
  return CouponStatus.Active;
}

export function isCouponActive(
  coupon: CouponLike,
  now: string = auckland.now().toISOString(),
): boolean {
  return getCouponStatus(coupon, now) === CouponStatus.Active;
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

// Relative countdown for display (e.g. "expires in 2 days") rather than a
// fixed date, so the urgency is obvious at a glance.
export function formatCouponExpiry(
  expiryDate: string,
  now: string = auckland.now().toISOString(),
): string {
  const diffHours = dayjs(expiryDate).diff(dayjs(now), "hour", true);
  if (diffHours < 1) return "expiring soon";
  if (diffHours < 24) {
    const hours = Math.round(diffHours);
    return `expires in ${hours} hour${hours === 1 ? "" : "s"}`;
  }
  const days = Math.round(diffHours / 24);
  return `expires in ${days} day${days === 1 ? "" : "s"}`;
}
