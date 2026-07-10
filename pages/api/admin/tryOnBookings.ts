import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { dbConnect } from "../../../lib/db/db";
import { createUser, findUser, findUserById } from "../../../lib/db/user-dao";
import { AccountType } from "../../../common/enums/AccountType";
import {
  getAllTryOnBookings,
  updateTryOnBookingStatus,
  checkTryOnSlotTaken,
  grantTryOnCoupon,
} from "../../../lib/db/tryon-booking-dao";
import { TryOnBookingSchema } from "../../../lib/db/schema";
import { TryOnStatus } from "../../../common/enums/TryOnStatus";
import { TRY_ON_FEE, TRY_ON_TIME_SLOTS } from "../../../common/constants/tryOn";
import { sendTryOnConfirmationEmail } from "../tryOnBooking";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  await dbConnect();

  const session = await getServerSession(req, res, authOptions);
  if (!session || !session.user?.email) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const users = await findUser(session.user.email);
  if (users.length === 0 || users[0].role !== AccountType.Admin) {
    return res.status(403).json({ message: "Forbidden: Admins only" });
  }

  if (req.method === "GET") {
    const bookings = await getAllTryOnBookings();
    return res.status(200).json(bookings);
  }

  if (req.method === "PATCH") {
    const bookingId = req.query.bookingId as string;
    const { status } = req.body;

    if (!bookingId || !status) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    await updateTryOnBookingStatus(bookingId, status);
    return res.status(200).json({ message: "Status updated" });
  }

  if (req.method === "POST") {
    const {
      userId: bodyUserId,
      newUser,
      phone,
      date,
      timeSlot,
    } = req.body;

    if (!date || !timeSlot) {
      return res.status(400).json({ message: "Missing required fields" });
    }
    if (!bodyUserId && !newUser) {
      return res
        .status(400)
        .json({ message: "A customer or new customer details are required" });
    }
    if (!TRY_ON_TIME_SLOTS.includes(timeSlot)) {
      return res.status(400).json({ message: "Invalid time slot" });
    }

    try {
      let userId = bodyUserId;
      let name: string;
      let email: string;

      if (userId) {
        const existingUser = await findUserById(userId);
        if (!existingUser) {
          return res.status(404).json({ message: "Customer not found" });
        }
        name = existingUser.name;
        email = existingUser.email;
      } else {
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
        name = `${newUser.firstName} ${newUser.lastName}`;
        email = newUser.email;
      }

      const alreadyTaken = await checkTryOnSlotTaken(date, timeSlot);
      if (alreadyTaken.length > 0) {
        return res
          .status(409)
          .json({ message: "This time slot has already been booked" });
      }

      const booking = new TryOnBookingSchema({
        userId,
        name,
        email,
        phone: phone ?? "",
        date,
        timeSlot,
        price: TRY_ON_FEE,
        paymentIntent: "ADMIN_MANUAL",
        paymentSuccess: true,
        status: TryOnStatus.Booked,
      });

      await booking.save();

      await grantTryOnCoupon(userId, date);

      await sendTryOnConfirmationEmail({
        email,
        name,
        date,
        timeSlot,
        price: TRY_ON_FEE,
      });

      return res.status(201).json({ message: "Try-on booking created", booking });
    } catch (err: any) {
      if (err?.code === 11000) {
        return res
          .status(409)
          .json({ message: "This time slot has already been booked" });
      }
      return res.status(500).json({ message: "Booking error", error: err });
    }
  }

  return res.status(405).json({ message: "Method not allowed" });
}
