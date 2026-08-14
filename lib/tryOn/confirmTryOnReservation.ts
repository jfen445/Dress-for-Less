import Stripe from "stripe";
import { Resend } from "resend";
import { TryOnBookingSchema } from "../db/schema";
import {
  getTryOnBookingByPaymentIntent,
  grantTryOnCoupon,
} from "../db/tryon-booking-dao";
import { TryOnBooking } from "../../common/types";
import TryOnConfirmationEmail from "@/components/Emails/TryOnConfirmation";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

// Turns a paid-for try-on hold into a real booking: marks it paid, grants the
// customer their try-on coupon and sends the confirmation email.
//
// Callers must have established that the payment succeeded — this does not check
// Stripe itself, because its callers already know: the webhook is told by
// Stripe, /api/tryOnBooking/confirm verifies before calling, and
// reconcileTryOnReservation only promotes after Stripe refused to cancel.
//
// Safe to call repeatedly and concurrently. The guard on paymentSuccess means
// exactly one call wins the write; every other call reports alreadyConfirmed and
// does nothing, so a customer can't be emailed twice or granted two coupons when
// the browser and the webhook arrive together.
export async function confirmTryOnReservation(
  paymentIntent: string,
  customer?: { name?: string; email?: string },
): Promise<{ booking?: TryOnBooking; alreadyConfirmed: boolean }> {
  const result = await TryOnBookingSchema.updateOne(
    { paymentIntent, paymentSuccess: { $ne: true } },
    { $set: { paymentSuccess: true } },
  );

  if (result.modifiedCount === 0) {
    const already = await getTryOnBookingByPaymentIntent(paymentIntent);
    return { booking: already ?? undefined, alreadyConfirmed: true };
  }

  // Past the guard, so this call is the sole confirmer and everything below
  // happens exactly once.
  const booking = (await getTryOnBookingByPaymentIntent(
    paymentIntent,
  )) as TryOnBooking | null;

  if (!booking) {
    return { alreadyConfirmed: false };
  }

  await grantTryOnCoupon(String(booking.userId), booking.date);

  // Best-effort: so the booking is identifiable on the Stripe dashboard without
  // cross-referencing the DB. Never block confirmation on it — the payment has
  // already succeeded. Stripe merges metadata keys rather than replacing the
  // object, so the `kind` stamped at creation survives this.
  await stripe.paymentIntents
    .update(paymentIntent, {
      metadata: {
        tryOnBookingId: String(booking._id ?? ""),
        name: customer?.name ?? booking.name,
        email: customer?.email ?? booking.email,
      },
    })
    .catch((err) =>
      console.error("Failed to attach try-on metadata to Stripe payment", err),
    );

  await sendTryOnConfirmationEmail({
    email: booking.email,
    name: booking.name,
    date: booking.date,
    timeSlot: booking.timeSlot,
    price: booking.price,
  });

  return { booking, alreadyConfirmed: false };
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

  // Resend resolves with { error } rather than throwing, so this has to be
  // checked or a failed confirmation is indistinguishable from a sent one.
  // Logged rather than thrown: the slot is already paid for and booked, and
  // both callers (the confirm route and admin manual creation) would turn a
  // throw here into a failed request over an appointment that really exists.
  const { error } = await resend.emails.send({
    from: `Dress for Less <${process.env.RESEND_EMAIL_ADDRESS}>`,
    to: [email],
    subject: "Your Dress for Less Try-On Confirmation",
    react: TryOnConfirmationEmail({ name, date, timeSlot, price }),
  });

  if (error)
    console.error(
      `Failed to send try-on confirmation to ${email} for ${date} ${timeSlot}:`,
      error,
    );
}
