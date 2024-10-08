import { NextApiRequest, NextApiResponse } from "next";
import { dbConnect } from "../../../lib/db/db";
import { getAllBookings } from "../../../lib/db/booking-dao";
import { getDress } from "../../../sanity/sanity.query";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  await dbConnect();

  if (req.method == "GET") {
    const allBookings = await getAllBookings();

    const allBookingInfo = await Promise.all(
      allBookings.map(async (booking) => {
        const dressInfo = await getDress(booking.dressId);
        return { ...booking, dress: dressInfo };
      })
    );

    res.status(200).json(allBookingInfo);
  }
}
