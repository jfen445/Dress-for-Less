import { NextApiRequest, NextApiResponse } from "next";
import dayjs from "dayjs";
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
    const { userId, discountAmount, expiryHours } = req.body;

    if (
      !userId ||
      discountAmount === undefined ||
      discountAmount === null ||
      expiryHours === undefined ||
      expiryHours === null
    ) {
      return res.status(400).json({
        message: "userId, discountAmount, and expiryHours are required",
      });
    }

    const amount = Number(discountAmount);
    if (isNaN(amount) || amount <= 0) {
      return res
        .status(400)
        .json({ message: "discountAmount must be a positive number" });
    }

    const hours = Number(expiryHours);
    if (!Number.isInteger(hours) || hours <= 0) {
      return res
        .status(400)
        .json({ message: "expiryHours must be a positive whole number" });
    }

    const expiryDate = dayjs().add(hours, "hour").toISOString();

    const created = await createCoupon({ userId, discountAmount: amount, expiryDate });
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
