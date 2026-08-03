import { auckland, dayjs } from "./timezone";
import { CouponType } from "../../common/enums/CouponType";
import { CouponScope } from "../../common/enums/CouponScope";
import { CouponStatus } from "../../common/enums/CouponStatus";

export type DiscountableCoupon = {
  discountAmount: number;
  discountType: CouponType;
  appliesTo?: CouponScope;
};

// Each coupon is computed independently against `itemPrices` (dress items
// only, never shipping) and summed — coupons don't compound/stack
// sequentially. Cart-scoped (or missing/legacy) coupons discount the full
// subtotal. SingleItem-scoped coupons pick their target by discount type:
// percentage targets the cheapest dress (minimizes the discount given),
// flat targets the most expensive dress (so its dollar value isn't
// wasted/capped on a cheap item) and is capped there so it can't spill into
// other items.
export function calculateCouponDiscount(
  coupons: DiscountableCoupon[],
  itemPrices: number[],
): number {
  const subtotal = itemPrices.reduce((sum, p) => sum + p, 0);
  const cheapestItemPrice =
    itemPrices.length > 0 ? Math.min(...itemPrices) : 0;
  const mostExpensiveItemPrice =
    itemPrices.length > 0 ? Math.max(...itemPrices) : 0;

  return coupons.reduce((sum, c) => {
    const isSingleItemScope = c.appliesTo === CouponScope.SingleItem;
    const isPercentage = c.discountType === CouponType.Percentage;

    if (!isSingleItemScope) {
      return (
        sum + (isPercentage ? (subtotal * c.discountAmount) / 100 : c.discountAmount)
      );
    }

    if (isPercentage) {
      return sum + (cheapestItemPrice * c.discountAmount) / 100;
    }
    return sum + Math.min(c.discountAmount, mostExpensiveItemPrice);
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
