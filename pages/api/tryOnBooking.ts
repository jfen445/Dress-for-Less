import { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import { dbConnect } from "../../lib/db/db";
import { TryOnBookingSchema } from "../../lib/db/schema";
import {
  getTakenTryOnSlots,
  checkTryOnSlotTaken,
  grantTryOnCoupon,
} from "../../lib/db/tryon-booking-dao";
import { findUser } from "../../lib/db/user-dao";
import { TryOnStatus } from "../../common/enums/TryOnStatus";
import { TRY_ON_FEE, TRY_ON_TIME_SLOTS } from "../../common/constants/tryOn";
import { Resend } from "resend";
import TryOnConfirmationEmail from "@/components/Emails/TryOnConfirmation";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  typescript: true,
  apiVersion: "2024-06-20",
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  await dbConnect();

  if (req.method === "GET") {
    const date = req.query.date as string;
    if (!date) {
      return res.status(400).json({ message: "date is required" });
    }

    const taken = await getTakenTryOnSlots(date);
    const takenSlots = taken.map((booking) => booking.timeSlot);

    return res.status(200).json({ takenSlots });
  }

  if (req.method === "POST") {
    const session = await getServerSession(req, res, authOptions);
    if (!session || !session.user?.email) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { date, timeSlot, name, phone, paymentIntent } = req.body;

    if (!date || !timeSlot || !name || !paymentIntent) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    if (!TRY_ON_TIME_SLOTS.includes(timeSlot)) {
      return res.status(400).json({ message: "Invalid time slot" });
    }

    try {
      const payment = await stripe.paymentIntents.retrieve(paymentIntent);

      if (
        payment.status !== "succeeded" ||
        payment.amount !== TRY_ON_FEE * 100
      ) {
        return res.status(402).json({ message: "Payment not confirmed" });
      }

      const alreadyTaken = await checkTryOnSlotTaken(date, timeSlot);
      if (alreadyTaken.length > 0) {
        return res
          .status(409)
          .json({ message: "This time slot has already been booked" });
      }

      const users = await findUser(session.user.email);
      const user = users[0];
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const booking = new TryOnBookingSchema({
        userId: user._id,
        name,
        email: session.user.email,
        phone: phone ?? "",
        date,
        timeSlot,
        price: TRY_ON_FEE,
        paymentIntent,
        paymentSuccess: true,
        status: TryOnStatus.Booked,
      });

      await booking.save();

      await grantTryOnCoupon(user._id, date);

      await sendTryOnConfirmationEmail({
        email: session.user.email,
        name,
        date,
        timeSlot,
        price: TRY_ON_FEE,
      });

      return res.status(201).json({ message: "Try-on booked", booking });
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

export async function sendTryOnConfirmationEmail({
  email,
  name,
  date,
  timeSlot,
  price,
}: {
  email: string;
  name: string;
  date: string;
  timeSlot: string;
  price: number;
}) {
  const resend = new Resend(process.env.RESEND_API_KEY as string);

  await resend.emails.send({
    from: `Dress for Less <${process.env.RESEND_EMAIL_ADDRESS}>`,
    to: [email],
    subject: "Your Dress for Less Try-On Confirmation",
    react: TryOnConfirmationEmail({ name, date, timeSlot, price }),
  });
}
