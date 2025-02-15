import { NextApiRequest, NextApiResponse } from "next";
import { BookingSchema } from "../../../lib/db/schema";
import { getBookingsByPaymentIntent } from "../../../lib/db/booking-dao";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method == "POST") {
    const intent = req.body.intent as string;
    console.log("thi si sthe intent", req.body.intent);
    const filter = { paymentIntent: intent };
    const update = { paymentSuccess: true };
    try {
      await BookingSchema.updateMany(filter, update);
      const bookings = await getBookingsByPaymentIntent(intent);

      console.log("booking", bookings);

      res.status(200).json({ message: "Update successful", booking: bookings });
    } catch (err) {
      res.status(404).json({ message: "Update Error", error: err });
    }
  }
}
