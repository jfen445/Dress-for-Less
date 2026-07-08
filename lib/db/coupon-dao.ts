import { CouponSchema } from "./schema";

export async function getAllCoupons() {
  return CouponSchema.find({});
}

export async function createCoupon(data: {
  userId: string;
  discountAmount: number;
  expiryDate: string;
}) {
  return CouponSchema.create(data);
}

export async function deleteCoupon(id: string) {
  return CouponSchema.findByIdAndDelete(id);
}

export async function getActiveCouponsByUser(userId: string) {
  return CouponSchema.find({
    userId,
    isRedeemed: false,
    expiryDate: { $gt: new Date().toISOString() },
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
