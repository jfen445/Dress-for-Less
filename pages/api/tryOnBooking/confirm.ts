import { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { dbConnect } from "../../../lib/db/db";
import { getTryOnBookingByPaymentIntent } from "../../../lib/db/tryon-booking-dao";
import { findUser } from "../../../lib/db/user-dao";
import { confirmTryOnReservation } from "../../../lib/tryOn/confirmTryOnReservation";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

// The browser's half of confirmation. Stripe's webhook calls the same
// confirmTryOnReservation, and whichever arrives first wins — this exists so a
// customer sees their booking confirmed immediately rather than whenever the
// webhook lands.
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
    return res.status(405).json({ message: "Method not allowed" });
  }

  const intent = req.body.intent as string;
  if (!intent) {
    return res.status(400).json({ message: "intent is required" });
  }

  try {
    // The hold must already exist (written by the reserve step) and must belong
    // to the caller. Without this, any signed-in user could flip an arbitrary
    // try-on to paid — and trigger its confirmation email and coupon — just by
    // replaying its paymentIntent.
    const booking = await getTryOnBookingByPaymentIntent(intent);

    if (!booking) {
      return res.status(404).json({ message: "Try-on booking not found" });
    }

    const [sessionUser] = await findUser(session.user.email);
    if (!sessionUser || String(booking.userId) !== String(sessionUser._id)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    // Re-confirm the charge actually succeeded before marking the booking paid.
    const payment = await stripe.paymentIntents.retrieve(intent);
    if (payment.status !== "succeeded") {
      return res
        .status(400)
        .json({ message: "Payment not confirmed. Please try again." });
    }

    const { booking: confirmed, alreadyConfirmed } =
      await confirmTryOnReservation(intent, {
        name: session.user?.name ?? undefined,
        email: session.user?.email ?? undefined,
      });

    return res.status(200).json({
      message: alreadyConfirmed ? "Already confirmed" : "Try-on booked",
      booking: confirmed,
    });
  } catch (err) {
    console.error("Try-on confirm failed", err);
    return res.status(500).json({ message: "Confirmation error" });
  }
}
