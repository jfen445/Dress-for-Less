import { NextApiRequest, NextApiResponse } from "next";
import { dbConnect } from "../../lib/db/db";
import { checkDuplicateBooking } from "../../lib/db/booking-dao";
import { checkBlockOut } from "../../lib/db/blockout-dao";
import { isBookingAvailable } from "../../lib/utils/checkBookingAvailability";
import { Booking } from "../../common/types";
import Stripe from "stripe";
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  await dbConnect();

  if (req.method == "POST") {
    const booking = req.body.booking as Booking;
    var errorResponse: String[] = [];

    for (const item of booking.items) {
      const checkBooking = await checkDuplicateBooking(
        item.dressId,
        item.size,
        item.dateBooked,
      );

      const blockedOut = await checkBlockOut(item.dressId, item.size as string, item.dateBooked);

      const available = await isBookingAvailable(
        item.dressId,
        item.size as string,
        item.dateBooked,
        item.deliveryType,
      );

      if (checkBooking.length > 0 || blockedOut || !available) {
        errorResponse.push(item.dressId);
      }
    }

    if (errorResponse.length > 0) {
      return res.status(404).json({
        message:
          "One or more dresses have already been booked for the selected day.",
        body: errorResponse,
      });
    }

    res.status(204).end();
  }
}
