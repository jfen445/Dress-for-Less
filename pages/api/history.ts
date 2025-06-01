import { dbConnect } from "../../lib/db/db";
import { NextApiRequest, NextApiResponse } from "next";
import { Booking, OrderHistory } from "../../common/types";
import { getBookingsByUser } from "../../lib/db/booking-dao";
import { getDress } from "../../sanity/sanity.query";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  await dbConnect();

  if (req.method == "GET") {
    const userId = req.query.userId as string;

    const bookings = await getBookingsByUser(userId);

    const userBookings = bookings as Booking[];

    const orderHistory: OrderHistory[] = [];

    for (const booking of userBookings) {
      try {
        const dress = await getDress(booking.dressId);
        const order: OrderHistory = {
          _id: booking._id,
          dressId: booking.dressId,
          userId: booking.userId,
          dateBooked: booking.dateBooked,
          blockOutPeriod: booking.blockOutPeriod,
          price: dress.price,
          address: booking.address,
          city: booking.city,
          country: booking.country,
          postCode: booking.postCode,
          deliveryType: booking.deliveryType,
          tracking: booking.tracking,
          isShipped: booking.isShipped,
          isReturned: booking.isReturned,
          size: booking.size,
          dressName: dress.name,
          dressDescription: dress.description,
          dressImages: dress.images[0],
        };

        orderHistory.push(order);
      } catch (error) {
        continue;
      }
    }

    res.status(200).json(orderHistory.reverse());
  }

  res.end();
}
