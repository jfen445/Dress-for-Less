import { dbConnect } from "../../lib/db/db";
import { NextApiRequest, NextApiResponse } from "next";
import { Booking } from "../../common/types";
import { getBookingsByUser } from "../../lib/db/booking-dao";
import { getDress } from "../../sanity/sanity.query";
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import { findUser } from "../../lib/db/user-dao";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  await dbConnect();

  if (req.method == "GET") {
    const userId = req.query.userId as string;

    // A user may only read their own order history.
    const [sessionUser] = await findUser(session.user.email ?? "");
    if (!sessionUser || String(sessionUser._id) !== userId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const bookings = await getBookingsByUser(userId);

    const orderHistory: Booking[] = await Promise.all(
      bookings.map(async (bookingDoc) => {
        const booking = bookingDoc.toObject();
        const items = await Promise.all(
          booking.items.map(async (item: any) => {
            try {
              const dress = await getDress(item.dressId);
              return { ...item, dress };
            } catch (error) {
              return item;
            }
          }),
        );
        return { ...booking, items };
      }),
    );

    return res.status(200).json(orderHistory.reverse());
  }

  res.end();
}
