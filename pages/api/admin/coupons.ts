import { NextApiRequest, NextApiResponse } from "next";
import { auckland } from "../../../lib/utils/timezone";
import { dbConnect } from "../../../lib/db/db";
import {
  getAllCoupons,
  createCoupon,
  deleteCoupon,
} from "../../../lib/db/coupon-dao";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { findUser } from "../../../lib/db/user-dao";
import { AccountType } from "../../../common/enums/AccountType";
import { CouponType } from "../../../common/enums/CouponType";

async function requireAdmin(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<boolean> {
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  const user = await findUser(session.user.email ?? "");
  if (user.length === 0 || user[0].role !== AccountType.Admin) {
    res.status(403).json({ message: "Forbidden: Admins only" });
    return false;
  }
  return true;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  await dbConnect();

  const isAdmin = await requireAdmin(req, res);
  if (!isAdmin) return;

  if (req.method === "GET") {
    const coupons = await getAllCoupons();
    return res.status(200).json(coupons);
  }

  if (req.method === "POST") {
    const {
      userId,
      discountAmount,
      discountType,
      isGlobal,
      maxRedemptions,
      startDate,
      durationDays,
    } = req.body;

    if (
      discountAmount === undefined ||
      discountAmount === null ||
      !discountType ||
      !startDate ||
      durationDays === undefined ||
      durationDays === null
    ) {
      return res.status(400).json({
        message:
          "discountAmount, discountType, startDate, and durationDays are required",
      });
    }

    if (!Object.values(CouponType).includes(discountType)) {
      return res.status(400).json({ message: "discountType is invalid" });
    }

    let redemptionLimit: number | undefined;
    if (isGlobal) {
      redemptionLimit = Number(maxRedemptions);
      if (!Number.isInteger(redemptionLimit) || redemptionLimit <= 0) {
        return res.status(400).json({
          message: "maxRedemptions must be a positive whole number for a global coupon",
        });
      }
    } else if (!userId) {
      return res
        .status(400)
        .json({ message: "userId is required for a non-global coupon" });
    }

    const amount = Number(discountAmount);
    if (isNaN(amount) || amount <= 0) {
      return res
        .status(400)
        .json({ message: "discountAmount must be a positive number" });
    }

    if (discountType === CouponType.Percentage && amount > 100) {
      return res
        .status(400)
        .json({ message: "A percentage discount cannot exceed 100" });
    }

    const start = auckland.toZone(startDate);
    if (!start.isValid()) {
      return res.status(400).json({ message: "startDate must be a valid date" });
    }

    const days = Number(durationDays);
    if (!Number.isInteger(days) || days <= 0) {
      return res
        .status(400)
        .json({ message: "durationDays must be a positive whole number" });
    }

    const normalizedStart = start.startOf("day");
    const expiryDate = normalizedStart.add(days, "day").endOf("day").toISOString();

    const created = await createCoupon({
      userId: isGlobal ? undefined : userId,
      discountAmount: amount,
      discountType,
      isGlobal: !!isGlobal,
      maxRedemptions: redemptionLimit,
      startDate: normalizedStart.toISOString(),
      expiryDate,
    });
    return res.status(201).json(created);
  }

  if (req.method === "DELETE") {
    const { id } = req.query;
    if (!id || typeof id !== "string") {
      return res.status(400).json({ message: "id query param is required" });
    }

    await deleteCoupon(id);
    return res.status(204).end();
  }

  return res.status(405).end();
}
