import { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import { dbConnect } from "../../lib/db/db";
import { TryOnBookingSchema } from "../../lib/db/schema";
import {
  getTakenTryOnSlots,
  checkTryOnSlotTaken,
  findOwnTryOnHolds,
  findLapsedTryOnReservations,
} from "../../lib/db/tryon-booking-dao";
import { getAvailabilityForDate } from "../../lib/db/tryon-availability-dao";
import { isTryOnBookingAllowedForDate } from "../../lib/utils/tryOnRules";
import { lapsedReservationCutoff } from "../../lib/utils/reservation";
import { reconcileTryOnReservation } from "../../lib/tryOn/reconcileTryOnReservation";
import { findUser } from "../../lib/db/user-dao";
import { auckland } from "../../lib/utils/timezone";
import { TryOnStatus } from "../../common/enums/TryOnStatus";
import { TRY_ON_FEE } from "../../common/constants/tryOn";

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

    const [taken, availability] = await Promise.all([
      getTakenTryOnSlots(date),
      getAvailabilityForDate(date),
    ]);
    const takenSlots = taken.map((booking) => booking.timeSlot);
    const availableSlots = (availability?.timeSlots ?? []).filter(
      (slot: string) => !takenSlots.includes(slot),
    );

    return res.status(200).json({ takenSlots, availableSlots });
  }

  // Reserve, then charge. This runs *before* stripe.confirmPayment, and writes
  // an unpaid row that holds the slot while the customer pays. A slot that goes
  // while they are typing their card stops the payment from happening at all,
  // rather than being discovered after their money has moved.
  //
  // Nothing here charges anything, so every failure path can simply return —
  // there is no money to unwind.
  if (req.method === "POST") {
    const session = await getServerSession(req, res, authOptions);
    if (!session || !session.user?.email) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { date, timeSlot, name, phone, paymentIntent } = req.body;

    if (!date || !timeSlot || !name || !paymentIntent) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    if (!isTryOnBookingAllowedForDate(date)) {
      return res.status(400).json({
        message: "Bookings for this date have closed",
      });
    }

    const availability = await getAvailabilityForDate(date);
    if (!availability || !availability.timeSlots.includes(timeSlot)) {
      return res
        .status(400)
        .json({ message: "This time slot is not available on the selected date" });
    }

    try {
      // The payment hasn't happened yet — that's the point — so this checks the
      // intent is the caller's own and is for the amount we expect, not that it
      // has succeeded. Without the ownership check any signed-in customer could
      // reserve a slot against somebody else's PaymentIntent.
      const payment = await stripe.paymentIntents.retrieve(paymentIntent);

      if (payment.amount !== TRY_ON_FEE * 100) {
        return res.status(400).json({ message: "Unexpected payment amount" });
      }

      const intentOwner = payment.metadata?.email ?? payment.receipt_email;
      if (intentOwner !== session.user.email) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const users = await findUser(session.user.email);
      const user = users[0];
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // A customer must not be blocked by their own abandoned attempt: they
      // reserve, their card is declined, they come back on a fresh intent, and
      // their own ghost hold tells them the slot is taken. Reconciled rather
      // than deleted, because those holds still have live PaymentIntents that
      // must be cancelled before their rows can safely go.
      const ownHolds = await findOwnTryOnHolds(
        String(user._id),
        date,
        timeSlot,
        paymentIntent,
      );
      for (const hold of ownHolds) {
        await reconcileTryOnReservation(hold);
      }

      let taken = await checkTryOnSlotTaken(date, timeSlot, paymentIntent);

      // Being blocked might just mean somebody else's checkout died holding this
      // slot. Holds only stop blocking once their payment has been proven dead,
      // so settle any that have outlived their window and look again — otherwise
      // a slot stays unsellable until the cron happens to run, and a scheduler
      // outage would quietly take appointments off sale.
      if (taken.length > 0) {
        const lapsed = await findLapsedTryOnReservations(
          lapsedReservationCutoff(),
        );
        let freedAny = false;

        for (const hold of lapsed) {
          if (hold === paymentIntent) continue;
          if ((await reconcileTryOnReservation(hold)) === "cancelled") {
            freedAny = true;
          }
        }

        if (freedAny) {
          taken = await checkTryOnSlotTaken(date, timeSlot, paymentIntent);
        }
      }

      if (taken.length > 0) {
        return res
          .status(409)
          .json({ message: "This time slot has already been booked" });
      }

      // Upsert on the intent, so a double submit or a retry after a dropped
      // connection updates this checkout's own hold instead of colliding with
      // it. A different intent reaching for the same slot fails the unique index
      // below and is turned away — with nothing charged, which is the whole
      // point of doing this first.
      const booking = await TryOnBookingSchema.findOneAndUpdate(
        { paymentIntent },
        {
          $set: {
            userId: user._id,
            name,
            email: session.user.email,
            phone: phone ?? "",
            date,
            timeSlot,
            price: TRY_ON_FEE,
            paymentIntent,
            reservedAt: auckland.now().toISOString(),
            status: TryOnStatus.Booked,
          },
          $setOnInsert: { paymentSuccess: false },
        },
        { upsert: true, new: true },
      );

      return res.status(201).json({ message: "Try-on slot reserved", booking });
    } catch (err: any) {
      // The unique index on { date, timeSlot } firing: somebody else's reserve
      // landed between the check above and this write. They got the slot, this
      // customer's card was never touched.
      if (err?.code === 11000) {
        return res
          .status(409)
          .json({ message: "This time slot has already been booked" });
      }
      console.error("Try-on reserve failed", err);
      return res.status(500).json({ message: "Booking error" });
    }
  }

  return res.status(405).json({ message: "Method not allowed" });
}
