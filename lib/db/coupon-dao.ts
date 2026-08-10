import { Types } from "mongoose";
import { CouponSchema } from "./schema";
import { CouponType } from "../../common/enums/CouponType";
import { CouponScope } from "../../common/enums/CouponScope";
import { isCouponUsableByUser } from "../utils/couponRules";
import { auckland } from "../utils/timezone";

export async function getAllCoupons() {
  return CouponSchema.find({});
}

export async function createCoupon(data: {
  userId?: string;
  code?: string;
  discountAmount: number;
  discountType: CouponType;
  appliesTo?: CouponScope;
  isGlobal?: boolean;
  maxRedemptions?: number;
  startDate: string;
  expiryDate: string;
  reason?: string;
}) {
  return CouponSchema.create(data);
}

export async function deleteCoupon(id: string) {
  return CouponSchema.findByIdAndDelete(id);
}

// Personal coupons only — global coupons are no longer surfaced
// automatically, they require a code (see getCouponByCode).
export async function getActiveCouponsByUser(userId: string) {
  const candidates = await CouponSchema.find({ userId });
  return candidates.filter((c) => isCouponUsableByUser(c, userId));
}

export async function getCouponByCode(code: string) {
  return CouponSchema.findOne({
    isGlobal: true,
    code: code.trim().toUpperCase(),
  });
}

export async function getCouponsByIds(ids: string[]) {
  return CouponSchema.find({ _id: { $in: ids } });
}

// Takes a slot on this coupon for a checkout that is about to pay, and reports
// whether it got one.
//
// This is the only place a coupon's capacity is genuinely enforced. Everything
// else — the checkbox list, /api/coupons/redeem, isCouponUsableByUser — reads
// state and then acts on it, which two customers can do simultaneously and both
// be told yes. Here the check *is* the write: a single findOneAndUpdate whose
// filter expresses the capacity condition, so Mongo evaluates it against the
// document it is about to modify and exactly one of two racing callers matches.
//
// The pipeline form of the update is what makes that possible — it prunes
// lapsed claims and appends the new one in the same operation, so capacity
// never has to be recomputed in a second round trip that a competitor could
// slip into.
//
// Idempotent on paymentIntent: a claim already held by this checkout is
// replaced rather than added to, and is excluded from the capacity count, so
// re-reserving the same order (a retry, a refreshed quote) doesn't consume a
// second slot or fail against itself.
export async function claimCoupon(
  coupon: { _id: any; isGlobal?: boolean; maxRedemptions?: number },
  userId: string,
  paymentIntent: string,
  expiresAt: string,
  now: string = auckland.now().toISOString(),
): Promise<boolean> {
  const capacity = coupon.isGlobal ? (coupon.maxRedemptions ?? 0) : 1;

  // Claims still holding a slot, ignoring this checkout's own. Excluding it is
  // what makes a retry idempotent — the claim it placed a moment ago must not
  // count as a competitor against itself.
  const liveClaims = (extraCondition?: object) => ({
    $size: {
      $filter: {
        input: { $ifNull: ["$pendingClaims", []] },
        as: "claim",
        cond: {
          $and: [
            { $gt: ["$$claim.expiresAt", now] },
            { $ne: ["$$claim.paymentIntent", paymentIntent] },
            ...(extraCondition ? [extraCondition] : []),
          ],
        },
      },
    },
  });

  const spent = coupon.isGlobal
    ? { $size: { $ifNull: ["$redeemedByUserIds", []] } }
    : { $cond: [{ $eq: ["$isRedeemed", true] }, 1, 0] };

  // Slots taken, permanently or on loan, must leave room for one more.
  const conditions: object[] = [
    { $lt: [{ $add: [spent, liveClaims()] }, capacity] },
  ];

  const filter: Record<string, unknown> = {
    _id: coupon._id,
    startDate: { $lte: now },
    expiryDate: { $gte: now },
  };

  if (coupon.isGlobal) {
    // One slot per customer: not already redeemed by them, and not already held
    // by another in-flight checkout of theirs.
    filter.redeemedByUserIds = { $ne: new Types.ObjectId(userId) };
    conditions.push({
      $eq: [liveClaims({ $eq: ["$$claim.userId", userId] }), 0],
    });
  } else {
    filter.isRedeemed = { $ne: true };
  }

  filter.$expr = conditions.length === 1 ? conditions[0] : { $and: conditions };

  const claimed = await CouponSchema.findOneAndUpdate(
    filter,
    [
      {
        $set: {
          pendingClaims: {
            $concatArrays: [
              {
                $filter: {
                  input: { $ifNull: ["$pendingClaims", []] },
                  as: "claim",
                  cond: {
                    $and: [
                      { $gt: ["$$claim.expiresAt", now] },
                      { $ne: ["$$claim.paymentIntent", paymentIntent] },
                    ],
                  },
                },
              },
              [{ userId, paymentIntent, expiresAt }],
            ],
          },
        },
      },
    ],
    { new: true },
  );

  return claimed !== null;
}

// Hands back every slot held by a checkout that isn't going to complete.
// Called wherever a reservation dies, so a coupon is never stranded by an
// abandoned cart. Safe to call for a paymentIntent that holds nothing.
export async function releaseCouponClaims(paymentIntent: string) {
  await CouponSchema.updateMany(
    { "pendingClaims.paymentIntent": paymentIntent },
    { $pull: { pendingClaims: { paymentIntent } } },
  );
}

// Marks the coupons as spent, once payment has succeeded, converting the slot
// this checkout was holding into a permanent redemption. The claim is pulled in
// the same write that records the redemption, so the slot is never counted
// twice — once as held and once as spent.
export async function redeemCoupons(
  coupons: { _id: any; isGlobal?: boolean }[],
  userId: string,
  paymentIntent?: string,
) {
  const personalIds = coupons.filter((c) => !c.isGlobal).map((c) => c._id);
  const globalIds = coupons.filter((c) => c.isGlobal).map((c) => c._id);

  // Drop this checkout's claim alongside the redemption. Pulling by
  // paymentIntent rather than by userId leaves any unrelated claim untouched.
  const clearClaim = paymentIntent
    ? { $pull: { pendingClaims: { paymentIntent } } }
    : {};

  await Promise.all([
    personalIds.length > 0
      ? CouponSchema.updateMany(
          { _id: { $in: personalIds } },
          { $set: { isRedeemed: true }, ...clearClaim },
        )
      : Promise.resolve(),
    globalIds.length > 0
      ? CouponSchema.updateMany(
          { _id: { $in: globalIds } },
          { $addToSet: { redeemedByUserIds: userId }, ...clearClaim },
        )
      : Promise.resolve(),
  ]);
}
