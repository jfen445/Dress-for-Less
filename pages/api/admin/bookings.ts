import { NextApiRequest, NextApiResponse } from "next";
import { dbConnect } from "../../../lib/db/db";
import {
  getAllBookings,
  checkDuplicateBooking,
} from "../../../lib/db/booking-dao";
import { createUser, findUser } from "../../../lib/db/user-dao";
import { getDress } from "../../../sanity/sanity.query";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { AccountType } from "../../../common/enums/AccountType";
import { BookingSchema } from "../../../lib/db/schema";
import { BookingStatus } from "../../../common/enums/BookingStatus";
import { checkBlockOut } from "../../../lib/db/blockout-dao";
import { calculateBookingWindow } from "../../../lib/utils/bookingWindow";
import { getNextOrderNumber } from "../../../lib/utils/orderNumber";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  await dbConnect();

  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const userEmail = session.user.email;

  if (!userEmail) {
    return res.status(401).json({ message: "User email not found in session" });
  }

  const user = await findUser(userEmail?.toString() ?? "");

  if (user.length === 0 || user[0].role !== AccountType.Admin) {
    return res.status(403).json({ message: "Forbidden: Admins only" });
  }

  if (req.method === "GET") {
    const allBookings = await getAllBookings();

    const allBookingInfo = await Promise.all(
      allBookings.map(async (booking) => {
        const items = await Promise.all(
          booking.items.map(async (item: any) => {
            const dressInfo = await getDress(item.dressId);
            return { ...item, dress: dressInfo };
          }),
        );
        return { ...booking, items };
      }),
    );

    res.status(200).json(allBookingInfo);
  } else if (req.method === "POST") {
    const {
      items: itemsPayload,
      userId: bodyUserId,
      newUser,
      deliveryType,
      address,
      billingAddress,
      instructions,
    } = req.body;

    if (!Array.isArray(itemsPayload) || itemsPayload.length === 0) {
      return res.status(400).json({ message: "At least one dress is required" });
    }
    if (!deliveryType) {
      return res.status(400).json({ message: "Missing required fields" });
    }
    if (
      itemsPayload.some(
        (item: any) => !item?.dressId || !item?.dateBooked || !item?.size,
      )
    ) {
      return res.status(400).json({ message: "Missing required fields" });
    }
    if (!bodyUserId && !newUser) {
      return res
        .status(400)
        .json({ message: "A customer or new customer details are required" });
    }

    const seen = new Set<string>();
    for (const item of itemsPayload) {
      const key = `${item.dressId}|${item.size}|${item.dateBooked}`;
      if (seen.has(key)) {
        return res.status(400).json({
          message: "The same dress, size and date was selected more than once",
        });
      }
      seen.add(key);
    }

    let userId = bodyUserId;
    if (!userId && newUser) {
      const result = await createUser({
        email: newUser.email,
        name: `${newUser.firstName} ${newUser.lastName}`,
        mobileNumber: "",
        instagramHandle: "",
        role: "user",
      });
      userId =
        "insertedId" in result
          ? result.insertedId.toString()
          : result._id.toString();
    }

    const bookingItems = [];
    for (const item of itemsPayload) {
      const dress = await getDress(item.dressId);
      if (!dress) return res.status(404).json({ message: "Dress not found" });

      const blocked = await checkBlockOut(item.dressId, item.size, item.dateBooked);
      if (blocked)
        return res
          .status(409)
          .json({ message: "This date is blocked out for the selected size" });

      const duplicate = await checkDuplicateBooking(
        item.dressId,
        item.size,
        item.dateBooked,
      );
      if (duplicate.length > 0)
        return res
          .status(409)
          .json({ message: "This date is already fully booked" });

      const price = parseInt(dress.price);
      const { blockedFrom, blockedUntil } = calculateBookingWindow(
        item.dateBooked,
        deliveryType,
      );

      bookingItems.push({
        dressId: item.dressId,
        dateBooked: item.dateBooked,
        blockedFrom,
        blockedUntil,
        deliveryType,
        address: address ?? {},
        size: item.size,
        price,
        instructions: instructions ?? "",
      });
    }

    const totalPrice = bookingItems.reduce((sum, item) => sum + item.price, 0);
    const orderNumber = await getNextOrderNumber();

    const booking = new BookingSchema({
      userId,
      orderNumber,
      items: bookingItems,
      totalPrice,
      billingAddress: billingAddress ?? {},
      tracking: "",
      isShipped: false,
      isReturned: false,
      paymentIntent: "ADMIN_MANUAL",
      paymentSuccess: true,
      status: BookingStatus.NA,
    });

    await booking.save();

    // await sendEmailConfirmation(booking.toObject());

    res.status(201).json({ message: "Booking created", booking });
  }
}
