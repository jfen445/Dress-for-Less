import Stripe from "stripe";
import { deleteTryOnReservation } from "../db/tryon-booking-dao";
import { confirmTryOnReservation } from "./confirmTryOnReservation";
import type { ReconcileOutcome } from "../booking/reconcileReservation";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

// The only sanctioned way to destroy a try-on hold.
//
// A hold takes an appointment slot while its owner pays, so getting rid of one
// is only safe if the payment behind it can never land afterwards. Deleting the
// row on its own doesn't achieve that — the PaymentIntent stays confirmable, so
// the customer can complete a 3DS challenge minutes later and end up charged
// with no appointment, or holding a slot somebody else has since taken.
// Cancelling first closes both: Stripe will not charge a cancelled intent.
//
// A cancel that fails because the payment already succeeded is not an error —
// it's the answer to a different question. That hold was paid for, so it gets
// promoted into a real booking instead of thrown away.
//
//   cancelled  — the payment can never happen; the row is gone and the slot is free
//   promoted   — the payment did happen; the row is now a confirmed booking
//   unresolved — we couldn't find out; the row is untouched and still holding
//
// Failing to `unresolved` deliberately keeps the slot held. Holding a slot we
// could have sold is recoverable; selling one twice is not.
//
// Admin-created rows carry paymentIntent "ADMIN_MANUAL" and paymentSuccess:
// true, so they never surface as holds and never reach this. If one somehow did,
// Stripe would reject the id and it would fail to `unresolved` with the row
// untouched — the safe direction.
export async function reconcileTryOnReservation(
  paymentIntent: string,
): Promise<ReconcileOutcome> {
  try {
    await stripe.paymentIntents.cancel(paymentIntent);
    await deleteTryOnReservation(paymentIntent);
    return "cancelled";
  } catch (cancelError) {
    // Stripe refuses to cancel an intent that has already succeeded, which is
    // exactly the case we must not treat as a failure.
    try {
      const payment = await stripe.paymentIntents.retrieve(paymentIntent);

      if (payment.status === "succeeded") {
        await confirmTryOnReservation(paymentIntent, {
          name: payment.metadata?.name,
          email: payment.metadata?.email ?? payment.receipt_email ?? undefined,
        });
        return "promoted";
      }

      // Cancel failed for some other reason — most likely the intent is in a
      // state Stripe won't cancel from, or it no longer exists. Leave the hold
      // in place rather than guess.
      console.error(
        `Could not cancel try-on payment intent ${paymentIntent}`,
        cancelError,
      );
      return "unresolved";
    } catch (retrieveError) {
      console.error(
        `Could not determine the status of try-on payment intent ${paymentIntent}`,
        retrieveError,
      );
      return "unresolved";
    }
  }
}
