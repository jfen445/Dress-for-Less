import { NextApiRequest, NextApiResponse } from "next";
import { dbConnect } from "../../../lib/db/db";
import { getAllBookings } from "../../../lib/db/booking-dao";
import { getDress } from "../../../sanity/sanity.query";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { findUser } from "../../../lib/db/user-dao";
import { AccountType } from "../../../common/enums/AccountType";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  await dbConnect();

  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  console.log("Admin bookings endpoint hit", session.user, session.user.email);

  const userEmail = session.user.email;

  console.log("User email from session:", userEmail);

  if (!userEmail) {
    return res.status(401).json({ message: "User email not found in session" });
  }

  const user = await findUser(userEmail?.toString() ?? "");
  console.log("User info retrieved:", user);

  if (user.length > 0 && user[0].role !== AccountType.Admin) {
    return res.status(403).json({ message: "Forbidden: Admins only" });
  }

  if (req.method == "GET") {
    const allBookings = await getAllBookings();

    const allBookingInfo = await Promise.all(
      allBookings.map(async (booking) => {
        const dressInfo = await getDress(booking.dressId);
        return { ...booking, dress: dressInfo };
      }),
    );

    res.status(200).json(allBookingInfo);
  }
}
