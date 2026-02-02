import { NextApiRequest, NextApiResponse } from "next";
import { dbConnect } from "../../lib/db/db";
import { checkDuplicateBooking } from "../../lib/db/booking-dao";
import { Booking } from "../../common/types";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  await dbConnect();

  if (req.method == "POST") {
    const dresses = req.body.booking as Booking[];
    var errorResponse: String[] = [];

    for (const dress of dresses) {
      const checkBooking = await checkDuplicateBooking(
        dress.dressId,
        dress.size,
        dress.dateBooked
      );

      if (checkBooking.length > 0) {
        errorResponse.push(dress.dressId);
      }
    }

    if (errorResponse.length > 0) {
      res.status(404).json({
        message:
          "One or more dresses have already been booked for the selected day.",
        body: errorResponse,
      });
    }

    res.status(204).end();
  }
}
