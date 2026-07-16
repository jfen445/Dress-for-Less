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
import { calculateBlockOutPeriod } from "../../../lib/utils/blockOutPeriod";

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
      dressId,
      userId: bodyUserId,
      newUser,
      dateBooked,
      size,
      deliveryType,
      address,
      billingAddress,
      instructions,
    } = req.body;

    if (!dressId || !dateBooked || !size || !deliveryType) {
      return res.status(400).json({ message: "Missing required fields" });
    }
    if (!bodyUserId && !newUser) {
      return res
        .status(400)
        .json({ message: "A customer or new customer details are required" });
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

    const dress = await getDress(dressId);
    if (!dress) return res.status(404).json({ message: "Dress not found" });

    const blocked = await checkBlockOut(dressId, size, dateBooked);
    if (blocked)
      return res
        .status(409)
        .json({ message: "This date is blocked out for the selected size" });

    const duplicate = await checkDuplicateBooking(dressId, size, dateBooked);
    if (duplicate.length > 0)
      return res
        .status(409)
        .json({ message: "This date is already fully booked" });

    const price = parseInt(dress.price);
    const blockOutPeriod = calculateBlockOutPeriod(dateBooked);

    const booking = new BookingSchema({
      userId,
      items: [
        {
          dressId,
          dateBooked,
          blockOutPeriod,
          deliveryType,
          address: address ?? {},
          size,
          price,
          instructions: instructions ?? "",
        },
      ],
      totalPrice: price,
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
