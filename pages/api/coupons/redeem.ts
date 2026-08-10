import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { dbConnect } from "../../../lib/db/db";
import { findUser } from "../../../lib/db/user-dao";
import { getCouponByCode } from "../../../lib/db/coupon-dao";
import {
  getCouponStatus,
  isCouponUsableByUser,
} from "../../../lib/utils/couponRules";
import { CouponStatus } from "../../../common/enums/CouponStatus";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  await dbConnect();

  const session = await getServerSession(req, res, authOptions);
  if (!session || !session.user?.email) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (req.method !== "POST") {
    return res.status(405).end();
  }

  const { code } = req.body;
  if (!code || typeof code !== "string" || !code.trim()) {
    return res.status(400).json({ message: "code is required" });
  }

  const users = await findUser(session.user.email);
  const user = users[0];
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  const coupon = await getCouponByCode(code);
  if (!coupon) {
    return res.status(404).json({ message: "Invalid coupon code" });
  }

  if (!isCouponUsableByUser(coupon, user._id)) {
    const status = getCouponStatus(coupon);

    // A code can be unusable while its status is still Active: every remaining
    // slot is held by someone mid-checkout. Those holds lapse, so this one is
    // worth trying again — quite unlike the other three, and telling the
    // customer they already redeemed a code they've never seen is worse than
    // saying nothing.
    const heldByOthers =
      status === CouponStatus.Active &&
      !(coupon.redeemedByUserIds ?? []).some(
        (id: any) => String(id) === String(user._id),
      );

    const message =
      status === CouponStatus.Expired
        ? "This code has expired"
        : status === CouponStatus.Scheduled
          ? "This code isn't active yet"
          : status === CouponStatus.Redeemed
            ? "This code has already been fully redeemed"
            : heldByOthers
              ? "This code is being used by someone else right now. Try again in a few minutes."
              : "You've already redeemed this code";
    return res.status(400).json({ message });
  }

  return res.status(200).json(coupon);
}
