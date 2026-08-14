import { describe, expect, it } from "vitest";
import {
  type CouponClaim,
  type CouponLike,
  activeClaims,
  calculateCouponDiscount,
  couponCapacity,
  formatCouponExpiry,
  getCouponStatus,
  isCouponActive,
  isCouponUsableByUser,
} from "../../../../lib/utils/couponRules";
import { CouponScope } from "../../../../common/enums/CouponScope";
import { CouponStatus } from "../../../../common/enums/CouponStatus";
import { CouponType } from "../../../../common/enums/CouponType";

const NOW = "2026-06-01T00:00:00.000Z";
const PAST = "2026-05-01T00:00:00.000Z";
const FUTURE = "2026-07-01T00:00:00.000Z";

const coupon = (over: Partial<CouponLike & { userId?: string }> = {}) => ({
  startDate: PAST,
  expiryDate: FUTURE,
  ...over,
});

const claim = (over: Partial<CouponClaim> = {}): CouponClaim => ({
  userId: "other-user",
  paymentIntent: "pi_other",
  expiresAt: FUTURE,
  ...over,
});

describe("calculateCouponDiscount", () => {
  const prices = [100, 200];

  it("applies a cart percentage to the whole subtotal", () => {
    expect(
      calculateCouponDiscount(
        [{ discountAmount: 10, discountType: CouponType.Percentage, appliesTo: CouponScope.Cart }],
        prices,
      ),
    ).toBe(30);
  });

  it("treats a coupon with no scope as cart-scoped", () => {
    expect(
      calculateCouponDiscount(
        [{ discountAmount: 10, discountType: CouponType.Percentage }],
        prices,
      ),
    ).toBe(30);
  });

  it("targets the cheapest item for a single-item percentage", () => {
    // Percentage picks the cheapest, which minimises what's given away.
    expect(
      calculateCouponDiscount(
        [
          {
            discountAmount: 10,
            discountType: CouponType.Percentage,
            appliesTo: CouponScope.SingleItem,
          },
        ],
        prices,
      ),
    ).toBe(10);
  });

  it("targets the most expensive item for a single-item flat amount", () => {
    expect(
      calculateCouponDiscount(
        [
          {
            discountAmount: 50,
            discountType: CouponType.Flat,
            appliesTo: CouponScope.SingleItem,
          },
        ],
        prices,
      ),
    ).toBe(50);
  });

  it("caps a single-item flat amount at that item, so it can't spill over", () => {
    expect(
      calculateCouponDiscount(
        [
          {
            discountAmount: 500,
            discountType: CouponType.Flat,
            appliesTo: CouponScope.SingleItem,
          },
        ],
        prices,
      ),
    ).toBe(200);
  });

  it("does not cap a cart-scoped flat amount at the subtotal", () => {
    // Deliberate: cart-scoped flat is returned at face value, so a $500 code
    // against a $300 cart yields $500 of discount — unlike the SingleItem
    // branch above, which clamps to its target item.
    //
    // The discount is a raw figure, not a payable total, so flooring belongs to
    // the callers and both do it: OrderSummary wraps the displayed total in
    // Math.max(0, …), and pages/api/booking.ts does the same for the persisted
    // one on both the reserve and admin PATCH paths.
    expect(
      calculateCouponDiscount(
        [{ discountAmount: 500, discountType: CouponType.Flat, appliesTo: CouponScope.Cart }],
        prices,
      ),
    ).toBe(500);
  });

  it("sums coupons independently rather than compounding them", () => {
    // Two 10% coupons on $100 give $20, not $19 — each is computed against the
    // original subtotal, not the running remainder.
    expect(
      calculateCouponDiscount(
        [
          { discountAmount: 10, discountType: CouponType.Percentage },
          { discountAmount: 10, discountType: CouponType.Percentage },
        ],
        [100],
      ),
    ).toBe(20);
  });

  it("discounts nothing when there are no items", () => {
    expect(
      calculateCouponDiscount(
        [{ discountAmount: 50, discountType: CouponType.Flat, appliesTo: CouponScope.SingleItem }],
        [],
      ),
    ).toBe(0);
    expect(
      calculateCouponDiscount(
        [{ discountAmount: 10, discountType: CouponType.Percentage }],
        [],
      ),
    ).toBe(0);
  });
});

describe("couponCapacity", () => {
  it("gives a personal coupon exactly one slot", () => {
    expect(couponCapacity(coupon())).toBe(1);
    expect(couponCapacity(coupon({ maxRedemptions: 99 }))).toBe(1);
  });

  it("gives a global coupon its maxRedemptions, defaulting to none", () => {
    expect(couponCapacity(coupon({ isGlobal: true, maxRedemptions: 5 }))).toBe(5);
    expect(couponCapacity(coupon({ isGlobal: true }))).toBe(0);
  });
});

describe("activeClaims", () => {
  it("ignores lapsed claims without needing anything to have pruned them", () => {
    const live = claim({ paymentIntent: "pi_live", expiresAt: FUTURE });
    const lapsed = claim({ paymentIntent: "pi_lapsed", expiresAt: PAST });

    expect(activeClaims(coupon({ pendingClaims: [live, lapsed] }), NOW)).toEqual([live]);
  });

  it("is empty when the coupon has no claims field at all", () => {
    expect(activeClaims(coupon(), NOW)).toEqual([]);
  });
});

describe("getCouponStatus", () => {
  it("reports Active inside its window", () => {
    expect(getCouponStatus(coupon(), NOW)).toBe(CouponStatus.Active);
    expect(isCouponActive(coupon(), NOW)).toBe(true);
  });

  it("reports Scheduled before it starts and Expired after it ends", () => {
    expect(getCouponStatus(coupon({ startDate: FUTURE }), NOW)).toBe(
      CouponStatus.Scheduled,
    );
    expect(getCouponStatus(coupon({ expiryDate: PAST }), NOW)).toBe(
      CouponStatus.Expired,
    );
  });

  it("reports Redeemed for a spent personal coupon", () => {
    expect(getCouponStatus(coupon({ isRedeemed: true }), NOW)).toBe(
      CouponStatus.Redeemed,
    );
  });

  it("reports Redeemed for a global coupon whose slots are all permanently spent", () => {
    expect(
      getCouponStatus(
        coupon({ isGlobal: true, maxRedemptions: 2, redeemedByUserIds: ["a", "b"] }),
        NOW,
      ),
    ).toBe(CouponStatus.Redeemed);
  });

  it("does NOT report Redeemed because a checkout is merely holding the last slot", () => {
    // The admin table must not call a code spent for fifteen minutes because
    // someone abandoned a cart. Held slots are availability's problem, not
    // status's.
    expect(
      getCouponStatus(
        coupon({
          isGlobal: true,
          maxRedemptions: 1,
          redeemedByUserIds: [],
          pendingClaims: [claim()],
        }),
        NOW,
      ),
    ).toBe(CouponStatus.Active);
  });

  it("prefers Redeemed over Expired when both apply", () => {
    expect(
      getCouponStatus(coupon({ isRedeemed: true, expiryDate: PAST }), NOW),
    ).toBe(CouponStatus.Redeemed);
  });
});

describe("isCouponUsableByUser — personal coupons", () => {
  it("is usable by its owner", () => {
    expect(isCouponUsableByUser(coupon({ userId: "u1" }), "u1", NOW)).toBe(true);
  });

  it("is not usable by anyone else", () => {
    expect(isCouponUsableByUser(coupon({ userId: "u1" }), "u2", NOW)).toBe(false);
  });

  it("is not usable once inactive, even by its owner", () => {
    expect(
      isCouponUsableByUser(coupon({ userId: "u1", expiryDate: PAST }), "u1", NOW),
    ).toBe(false);
  });

  it("stays usable to the owner while they hold their own claim", () => {
    // A retry must not be blocked by the claim its own first attempt placed.
    expect(
      isCouponUsableByUser(
        coupon({ userId: "u1", pendingClaims: [claim({ userId: "u1" })] }),
        "u1",
        NOW,
      ),
    ).toBe(true);
  });

  it("is refused to the owner if some other user somehow holds a claim", () => {
    // Shouldn't be reachable, so it is allowed only to be restrictive.
    expect(
      isCouponUsableByUser(
        coupon({ userId: "u1", pendingClaims: [claim({ userId: "u2" })] }),
        "u1",
        NOW,
      ),
    ).toBe(false);
  });

  it("ignores a lapsed claim", () => {
    expect(
      isCouponUsableByUser(
        coupon({ userId: "u1", pendingClaims: [claim({ userId: "u2", expiresAt: PAST })] }),
        "u1",
        NOW,
      ),
    ).toBe(true);
  });
});

describe("isCouponUsableByUser — global coupons", () => {
  const global = (over: Partial<CouponLike> = {}) =>
    coupon({ isGlobal: true, maxRedemptions: 1, ...over });

  it("is usable while a slot is free", () => {
    expect(isCouponUsableByUser(global(), "u1", NOW)).toBe(true);
  });

  it("is refused to someone who already redeemed it", () => {
    expect(
      isCouponUsableByUser(global({ redeemedByUserIds: ["u1"] }), "u1", NOW),
    ).toBe(false);
  });

  it("counts another customer's live claim against capacity", () => {
    // The pre-flight half of what stops a code being spent past its limit.
    expect(
      isCouponUsableByUser(global({ pendingClaims: [claim({ userId: "u2" })] }), "u1", NOW),
    ).toBe(false);
  });

  it("still allows a second customer when capacity has room", () => {
    expect(
      isCouponUsableByUser(
        global({ maxRedemptions: 2, pendingClaims: [claim({ userId: "u2" })] }),
        "u1",
        NOW,
      ),
    ).toBe(true);
  });

  it("counts permanent redemptions and live claims together", () => {
    expect(
      isCouponUsableByUser(
        global({
          maxRedemptions: 2,
          redeemedByUserIds: ["u2"],
          pendingClaims: [claim({ userId: "u3" })],
        }),
        "u1",
        NOW,
      ),
    ).toBe(false);
  });

  it("lets the holder through even when their own claim is the last slot", () => {
    expect(
      isCouponUsableByUser(global({ pendingClaims: [claim({ userId: "u1" })] }), "u1", NOW),
    ).toBe(true);
  });

  it("refuses a past redeemer even if they are currently holding a claim", () => {
    expect(
      isCouponUsableByUser(
        global({
          maxRedemptions: 5,
          redeemedByUserIds: ["u1"],
          pendingClaims: [claim({ userId: "u1" })],
        }),
        "u1",
        NOW,
      ),
    ).toBe(false);
  });

  it("compares ids by string, so Mongo ObjectIds match their string form", () => {
    // Production hands these in as ObjectIds, not strings.
    const objectIdish = { toString: () => "u1" } as unknown as string;

    expect(
      isCouponUsableByUser(
        global({ maxRedemptions: 5, redeemedByUserIds: [objectIdish] }),
        "u1",
        NOW,
      ),
    ).toBe(false);
  });
});

describe("formatCouponExpiry", () => {
  const from = (isoOffsetHours: number) =>
    new Date(Date.parse(NOW) + isoOffsetHours * 3_600_000).toISOString();

  it("says 'expiring soon' under an hour", () => {
    expect(formatCouponExpiry(from(0.5), NOW)).toBe("expiring soon");
  });

  it("singularises one hour and one day", () => {
    expect(formatCouponExpiry(from(1), NOW)).toBe("expires in 1 hour");
    expect(formatCouponExpiry(from(25), NOW)).toBe("expires in 1 day");
  });

  it("counts hours below a day and days at or above one", () => {
    expect(formatCouponExpiry(from(5), NOW)).toBe("expires in 5 hours");
    expect(formatCouponExpiry(from(24), NOW)).toBe("expires in 1 day");
    expect(formatCouponExpiry(from(48), NOW)).toBe("expires in 2 days");
  });
});
