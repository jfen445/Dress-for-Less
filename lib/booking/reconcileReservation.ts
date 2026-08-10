import Stripe from "stripe";
import { BookingSchema } from "../db/schema";
import { releaseCouponClaims } from "../db/coupon-dao";
import { confirmReservation } from "../../pages/api/payment/paymentConfirm";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);
const FREE_COUPON_CHECKOUT_PREFIX = "FREE_COUPON_";

export type ReconcileOutcome = "cancelled" | "promoted" | "unresolved";

// The only sanctioned way to destroy a reservation.
//
// A reservation blocks a dress while its owner pays, so getting rid of one is
// only safe if the payment behind it can never land afterwards. Deleting the
// row on its own doesn't achieve that — the PaymentIntent stays confirmable, so
// the customer can complete a 3DS challenge minutes later and end up charged
// with no booking, or holding a second booking for a date somebody else has
// since taken. Cancelling first closes both: Stripe will not charge a cancelled
// intent.
//
// A cancel that fails because the payment already succeeded is not an error —
// it's the answer to a different question. That reservation was paid for, so it
// gets promoted into a real booking instead of thrown away.
//
//   cancelled  — the payment can never happen; the row is gone and the date is free
//   promoted   — the payment did happen; the row is now a confirmed booking
//   unresolved — we couldn't find out; the row is untouched and still blocking
//
// Failing to `unresolved` deliberately keeps the date blocked. Blocking a date
// we could have sold is recoverable; selling one twice is not.
export async function reconcileReservation(
  paymentIntent: string,
): Promise<ReconcileOutcome> {
  // Free-coupon checkouts have no Stripe payment behind them, so there is
  // nothing that could later charge and nothing to cancel.
  if (paymentIntent.startsWith(FREE_COUPON_CHECKOUT_PREFIX)) {
    await deleteReservation(paymentIntent);
    return "cancelled";
  }

  try {
    await stripe.paymentIntents.cancel(paymentIntent);
    await deleteReservation(paymentIntent);
    return "cancelled";
  } catch (cancelError) {
    // Stripe refuses to cancel an intent that has already succeeded, which is
    // exactly the case we must not treat as a failure.
    try {
      const payment = await stripe.paymentIntents.retrieve(paymentIntent);

      if (payment.status === "succeeded") {
        await confirmReservation(paymentIntent, {
          name: payment.metadata?.name,
          email: payment.metadata?.email ?? payment.receipt_email ?? undefined,
        });
        return "promoted";
      }

      // Cancel failed for some other reason — most likely the intent is in a
      // state Stripe won't cancel from, or it no longer exists. Leave the
      // reservation in place rather than guess.
      console.error(
        `Could not cancel payment intent ${paymentIntent}`,
        cancelError,
      );
      return "unresolved";
    } catch (retrieveError) {
      console.error(
        `Could not determine the status of payment intent ${paymentIntent}`,
        retrieveError,
      );
      return "unresolved";
    }
  }
}

// Narrow on purpose: only ever removes an unpaid row that the reserve step
// wrote. A confirmed booking, or a row predating the reservation scheme, is
// never touched however this is called.
//
// The coupon slots go back with it. A reservation and the claims it holds are
// one unit — releasing the dress but not the code would leave a one-use coupon
// locked until it lapsed, for an order that no longer exists.
async function deleteReservation(paymentIntent: string) {
  await BookingSchema.deleteOne({
    paymentIntent,
    paymentSuccess: { $ne: true },
    reservedAt: { $ne: null },
  });

  await releaseCouponClaims(paymentIntent);
}
