import { NextApiRequest, NextApiResponse } from "next";
import { dbConnect } from "../../../lib/db/db";
import { getCurrentlyActiveBookingsByDress } from "../../../lib/db/booking-dao";
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
    const statuses = await getCurrentlyActiveBookingsByDress();
    return res.status(200).json(statuses);
  }

  return res.status(405).end();
}
