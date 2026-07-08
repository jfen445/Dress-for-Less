import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { dbConnect } from "../../../lib/db/db";
import { findUser } from "../../../lib/db/user-dao";
import { AccountType } from "../../../common/enums/AccountType";
import {
  getAllTryOnBookings,
  updateTryOnBookingStatus,
} from "../../../lib/db/tryon-booking-dao";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  await dbConnect();

  const session = await getServerSession(req, res, authOptions);
  if (!session || !session.user?.email) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const users = await findUser(session.user.email);
  if (users.length === 0 || users[0].role !== AccountType.Admin) {
    return res.status(403).json({ message: "Forbidden: Admins only" });
  }

  if (req.method === "GET") {
    const bookings = await getAllTryOnBookings();
    return res.status(200).json(bookings);
  }

  if (req.method === "PATCH") {
    const bookingId = req.query.bookingId as string;
    const { status } = req.body;

    if (!bookingId || !status) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    await updateTryOnBookingStatus(bookingId, status);
    return res.status(200).json({ message: "Status updated" });
  }

  return res.status(405).json({ message: "Method not allowed" });
}
