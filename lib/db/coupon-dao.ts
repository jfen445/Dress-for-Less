import { CouponSchema } from "./schema";
import { CouponType } from "../../common/enums/CouponType";

export async function getAllCoupons() {
  return CouponSchema.find({});
}

export async function createCoupon(data: {
  userId: string;
  discountAmount: number;
  discountType: CouponType;
  startDate: string;
  expiryDate: string;
}) {
  return CouponSchema.create(data);
}

export async function deleteCoupon(id: string) {
  return CouponSchema.findByIdAndDelete(id);
}

export async function getActiveCouponsByUser(userId: string) {
  const now = new Date().toISOString();
  return CouponSchema.find({
    userId,
    isRedeemed: false,
    startDate: { $lte: now },
    expiryDate: { $gt: now },
  });
}

export async function getCouponsByIds(ids: string[]) {
  return CouponSchema.find({ _id: { $in: ids } });
}

export async function redeemCoupons(ids: string[]) {
  return CouponSchema.updateMany(
    { _id: { $in: ids } },
    { $set: { isRedeemed: true } },
  );
}
