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
