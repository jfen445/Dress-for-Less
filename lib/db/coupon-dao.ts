import { CouponSchema } from "./schema";
import { CouponType } from "../../common/enums/CouponType";
import { isCouponUsableByUser } from "../utils/couponRules";

export async function getAllCoupons() {
  return CouponSchema.find({});
}

export async function createCoupon(data: {
  userId?: string;
  discountAmount: number;
  discountType: CouponType;
  isGlobal?: boolean;
  maxRedemptions?: number;
  startDate: string;
  expiryDate: string;
}) {
  return CouponSchema.create(data);
}

export async function deleteCoupon(id: string) {
  return CouponSchema.findByIdAndDelete(id);
}

export async function getActiveCouponsByUser(userId: string) {
  const candidates = await CouponSchema.find({
    $or: [{ isGlobal: true }, { userId }],
  });
  return candidates.filter((c) => isCouponUsableByUser(c, userId));
}

export async function getCouponsByIds(ids: string[]) {
  return CouponSchema.find({ _id: { $in: ids } });
}

export async function redeemCoupons(
  coupons: { _id: any; isGlobal?: boolean }[],
  userId: string,
) {
  const personalIds = coupons.filter((c) => !c.isGlobal).map((c) => c._id);
  const globalIds = coupons.filter((c) => c.isGlobal).map((c) => c._id);

  await Promise.all([
    personalIds.length > 0
      ? CouponSchema.updateMany(
          { _id: { $in: personalIds } },
          { $set: { isRedeemed: true } },
        )
      : Promise.resolve(),
    globalIds.length > 0
      ? CouponSchema.updateMany(
          { _id: { $in: globalIds } },
          { $addToSet: { redeemedByUserIds: userId } },
        )
      : Promise.resolve(),
  ]);
}
