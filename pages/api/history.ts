import { dbConnect } from "../../lib/db/db";
import { NextApiRequest, NextApiResponse } from "next";
import { Booking, OrderHistory } from "../../common/types";
import { getBookingsByUser } from "../../lib/db/booking-dao";
import { getDress } from "../../sanity/sanity.query";
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";

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

    const bookings = await getBookingsByUser(userId);

    const userBookings = bookings as unknown as Booking[];

    const orderHistory: OrderHistory[] = [];

    for (const booking of userBookings) {
      for (const item of booking.items) {
        try {
          const dress = await getDress(item.dressId);
          const order: OrderHistory = {
            _id: (item as any)._id ?? booking._id,
            dressId: item.dressId,
            userId: booking.userId,
            dateBooked: item.dateBooked,
            blockedFrom: item.blockedFrom,
            blockedUntil: item.blockedUntil,
            price: dress.price,
            address: item.address
              ? {
                  address: item.address.address,
                  suburb: item.address.suburb,
                  city: item.address.city,
                  country: item.address.country,
                  postCode: item.address.postCode,
                }
              : undefined,
            deliveryType: String(item.deliveryType),
            tracking: booking.tracking,
            isShipped: booking.isShipped,
            isReturned: booking.isReturned,
            size: item.size,
            dressName: dress.name,
            dressDescription: dress.description,
            dressImages: dress.images[0],
            orderNumber: booking.orderNumber,
          };

          orderHistory.push(order);
        } catch (error) {
          continue;
        }
      }
    }

    res.status(200).json(orderHistory.reverse());
  }

  res.end();
}
