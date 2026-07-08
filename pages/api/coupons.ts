import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import { dbConnect } from "../../lib/db/db";
import { findUser } from "../../lib/db/user-dao";
import { getActiveCouponsByUser } from "../../lib/db/coupon-dao";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  await dbConnect();

  const session = await getServerSession(req, res, authOptions);
  if (!session || !session.user?.email) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (req.method === "GET") {
    const users = await findUser(session.user.email);
    const user = users[0];
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const coupons = await getActiveCouponsByUser(user._id);
    return res.status(200).json(coupons);
  }

  return res.status(405).end();
}
