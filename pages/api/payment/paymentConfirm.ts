import { NextApiRequest, NextApiResponse } from "next";
import { BookingSchema, UserSchema } from "../../../lib/db/schema";
import { getBookingsByPaymentIntent } from "../../../lib/db/booking-dao";
import OrderReceiptEmail from "@/components/Emails/OrderReceipt";
import { Resend } from "resend";
import { getDress } from "../../../sanity/sanity.query";
import { Booking, OrderReceipt } from "../../../common/types";
import { removeItemFromCartByFields } from "../../../lib/db/cart-dao";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { dbConnect } from "../../../lib/db/db";
import { findUser } from "../../../lib/db/user-dao";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);
const FREE_COUPON_CHECKOUT_PREFIX = "FREE_COUPON_";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  await dbConnect();

  if (req.method !== "POST") {
    return res.status(405).end();
  }

  const intent = req.body.intent as string;
  if (!intent) {
    return res.status(400).json({ message: "intent is required" });
  }

  try {
    // The booking must already exist (created by /api/booking only after a
    // verified payment) and must belong to the caller. Without this, any
    // signed-in user could flip an arbitrary booking to paid — and trigger its
    // confirmation email — just by replaying its paymentIntent.
    const bookings = await getBookingsByPaymentIntent(intent);
    const booking = bookings[0] as Booking | undefined;

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    const [sessionUser] = await findUser(session.user.email);
    if (!sessionUser || String(booking.userId) !== String(sessionUser._id)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    // Re-confirm the charge actually succeeded before marking the booking paid.
    // Free-coupon checkouts have no Stripe intent, so they skip this.
    if (!intent.startsWith(FREE_COUPON_CHECKOUT_PREFIX)) {
      const payment = await stripe.paymentIntents.retrieve(intent);
      if (payment.status !== "succeeded") {
        return res
          .status(400)
          .json({ message: "Payment not confirmed. Please try again." });
      }
    }

    const result = await BookingSchema.updateMany(
      { paymentIntent: intent, paymentSuccess: { $ne: true } },
      { $set: { paymentSuccess: true } },
    );

    const updatedBookings = await getBookingsByPaymentIntent(intent);
    const updatedBooking = updatedBookings[0] as Booking | undefined;

    if (result.modifiedCount === 0) {
      return res
        .status(200)
        .json({ message: "No bookings updated", booking: updatedBooking });
    }

    if (updatedBooking) {
      for (const item of updatedBooking.items) {
        await removeItemFromCartByFields(
          updatedBooking.userId,
          item.dressId,
          item.dateBooked,
          item.size,
        );
      }

      await sendEmailConfirmation(updatedBooking);
    }

    return res
      .status(200)
      .json({ message: "Update successful", booking: updatedBooking });
  } catch (err) {
    console.error("paymentConfirm error", err);
    return res.status(500).json({ message: "Update Error" });
  }
}

export async function sendEmailConfirmation(booking: Booking) {
  const resend = new Resend(process.env.RESEND_API_KEY as string);

  let user: any = null;
  if ((booking as any).user && (booking as any).user.length > 0) {
    user = (booking as any).user[0];
  } else if (booking.userId) {
    user = await UserSchema.findById(booking.userId).lean();
  }

  const orderReceipt: OrderReceipt[] = await Promise.all(
    booking.items.map(async (item) => {
      const dress = (item as any).dress || (await getDress(item.dressId));

      return {
        _id: item._id,
        dressId: item.dressId,
        name: user?.name ?? "",
        dateBooked: item.dateBooked,
        blockedFrom: item.blockedFrom,
        blockedUntil: item.blockedUntil,
        price: item.price,
        address: item.address,
        billingAddress: booking.billingAddress,
        deliveryType: String(item.deliveryType),
        tracking: booking.tracking ?? "",
        isShipped: booking.isShipped ?? false,
        isReturned: booking.isReturned ?? false,
        paymentIntent: booking.paymentIntent,
        size: item.size,
        dressName: dress?.name ?? "",
        dressDescription: dress?.description ?? "",
        dressImage: dress?.images?.[0] ?? "",
        orderNumber: booking.orderNumber,
      };
    }),
  );

  if (!user || !user.email) {
    console.error("No user found for email confirmation");
    return;
  }

  const toEmail = user?.email
    ? [user.email]
    : [process.env.RESEND_EMAIL_ADDRESS as string];

  await resend.emails.send({
    from: `Dress for Less <${process.env.RESEND_EMAIL_ADDRESS}>`,
    to: toEmail,
    subject: "Your Dress for Less Booking Confirmation",
    react: OrderReceiptEmail({ orderReceipt }),
  });
}
