import { NextApiRequest, NextApiResponse } from "next";
import { Resend } from "resend";
import { auckland } from "../../../lib/utils/timezone";
import { dbConnect } from "../../../lib/db/db";
import {
  getAllCoupons,
  createCoupon,
  deleteCoupon,
} from "../../../lib/db/coupon-dao";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { findUser, findUserById } from "../../../lib/db/user-dao";
import { AccountType } from "../../../common/enums/AccountType";
import { CouponType } from "../../../common/enums/CouponType";
import { CouponScope } from "../../../common/enums/CouponScope";
import StoreCreditEmail, {
  getStoreCreditSubject,
} from "@/components/Emails/StoreCredit";

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
      code,
      discountAmount,
      discountType,
      appliesTo,
      isGlobal,
      maxRedemptions,
      startDate,
      durationDays,
      reason,
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

    if (appliesTo !== undefined && !Object.values(CouponScope).includes(appliesTo)) {
      return res.status(400).json({ message: "appliesTo is invalid" });
    }

    let redemptionLimit: number | undefined;
    let normalizedCode: string | undefined;
    if (isGlobal) {
      redemptionLimit = Number(maxRedemptions);
      if (!Number.isInteger(redemptionLimit) || redemptionLimit <= 0) {
        return res.status(400).json({
          message: "maxRedemptions must be a positive whole number for a global coupon",
        });
      }
      normalizedCode =
        typeof code === "string" ? code.trim().toUpperCase() : "";
      if (!normalizedCode) {
        return res.status(400).json({
          message: "code is required for a global coupon",
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

    let created;
    try {
      created = await createCoupon({
        userId: isGlobal ? undefined : userId,
        code: isGlobal ? normalizedCode : undefined,
        discountAmount: amount,
        discountType,
        appliesTo: appliesTo ?? CouponScope.Cart,
        isGlobal: !!isGlobal,
        maxRedemptions: redemptionLimit,
        startDate: normalizedStart.toISOString(),
        expiryDate,
        reason: reason || undefined,
      });
    } catch (err: any) {
      if (err?.code === 11000) {
        return res
          .status(400)
          .json({ message: "This coupon code is already in use" });
      }
      throw err;
    }

    // Global coupons have no single recipient at creation time (customers
    // redeem them later), so the store credit email only fires for a
    // personal, fixed-amount coupon issued to a specific user.
    if (!isGlobal && discountType === CouponType.Flat) {
      try {
        const recipient = await findUserById(userId);
        if (recipient?.email) {
          const resend = new Resend(process.env.RESEND_API_KEY as string);
          // Resend resolves with { error } rather than throwing, so this has
          // to be checked or the customer is never told they have credit.
          const { error } = await resend.emails.send({
            from: `Dress for Less <${process.env.RESEND_EMAIL_ADDRESS}>`,
            to: [recipient.email],
            subject: getStoreCreditSubject(),
            react: StoreCreditEmail({
              name: recipient.name ?? "",
              email: recipient.email,
              creditAmount: amount,
              reason: reason || "Store credit",
              expiryDate,
            }),
          });

          if (error) throw new Error(`${error.name}: ${error.message}`);
        }
      } catch (err) {
        // Coupon creation already succeeded; a failed notification email
        // shouldn't roll that back or fail the request. Logged so the credit
        // can be re-sent by hand rather than sitting unclaimed.
        console.error("Failed to send store credit email", err);
      }
    }

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
