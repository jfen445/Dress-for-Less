import { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";
import { Resend } from "resend";
import { dbConnect } from "../../../lib/db/db";
import { getBookingsByPaymentIntent } from "../../../lib/db/booking-dao";
import { releaseCouponClaims } from "../../../lib/db/coupon-dao";
import { getTryOnBookingByPaymentIntent } from "../../../lib/db/tryon-booking-dao";
import { BookingSchema } from "../../../lib/db/schema";
import { PaymentKind } from "../../../common/enums/PaymentKind";
import { confirmReservation } from "../payment/paymentConfirm";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);
const ADMIN_NOTIFICATION_EMAIL = "dressforlessnz@gmail.com";

// How long after a try-on payment succeeds we still expect its booking row to
// be on its way. Unlike a rental, a try-on charges *before* it books, so for a
// few seconds after the charge there is legitimately no row to find and the
// webhook must not cry orphan. See handleTryOnSucceeded.
const TRY_ON_BOOKING_GRACE_SECONDS = 3 * 60;

// Stripe signs the exact bytes it sent, so the body must not be parsed before
// the signature is checked.
export const config = { api: { bodyParser: false } };

async function readRawBody(req: NextApiRequest): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

// Stripe is the authority on whether a payment happened — not the customer's
// browser. It retries for days, so a booking gets confirmed even if the
// customer closes the tab the instant their card clears, or their connection
// drops on the way back to /order-success.
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    return res.status(405).end();
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = req.headers["stripe-signature"];

  if (!webhookSecret || !signature) {
    return res.status(400).json({ message: "Missing webhook signature" });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      await readRawBody(req),
      signature as string,
      webhookSecret,
    );
  } catch (err) {
    console.error("Stripe webhook signature verification failed", err);
    return res.status(400).json({ message: "Invalid signature" });
  }

  await dbConnect();

  try {
    const payment = event.data.object as Stripe.PaymentIntent;

    switch (event.type) {
      case "payment_intent.succeeded":
        await handleSucceeded(payment, event.created);
        break;

      // Only a cancelled intent is genuinely dead. `payment_intent.payment_failed`
      // is deliberately not handled here: a declined card leaves the intent in
      // requires_payment_method, still confirmable, and the customer is usually
      // about to retry with another card. Dropping the hold on that event would
      // free the date while its payment could still land — someone else takes it,
      // the retry succeeds, and we are back to a charge with no booking. The hold
      // stays until the payment is provably dead, whether that is this event, an
      // explicit release, or the sweep.
      case "payment_intent.canceled":
        await handleCancelled(payment.id);
        break;
    }
  } catch (err) {
    // A non-2xx tells Stripe to retry, which is what we want for a transient
    // failure — the handlers are all safe to run again.
    console.error(`Stripe webhook handler failed for ${event.type}`, err);
    return res.status(500).json({ message: "Handler failed" });
  }

  return res.status(200).json({ received: true });
}

// Not every payment we hear about is a dress rental. Try-ons are charged
// through the same PaymentIntent endpoint but land in their own collection, so
// the intent carries a `kind` telling us which flow — and therefore which
// collection and which guarantees — applies.
async function handleSucceeded(
  payment: Stripe.PaymentIntent,
  eventCreatedAt: number,
) {
  if (payment.metadata?.kind === PaymentKind.TryOn) {
    await handleTryOnSucceeded(payment, eventCreatedAt);
    return;
  }

  const bookings = await getBookingsByPaymentIntent(payment.id);

  if (bookings.length === 0) {
    // Intents created before `kind` existed carry no marker, and a try-on one
    // would look exactly like an orphaned rental. Check the other collection
    // before raising an alarm.
    const tryOn = await getTryOnBookingByPaymentIntent(payment.id);
    if (tryOn) {
      return;
    }

    await alertOrphanedPayment(payment);
    return;
  }

  await confirmReservation(payment.id, {
    name: payment.metadata?.name,
    email: payment.metadata?.email ?? payment.receipt_email ?? undefined,
  });
}

// A try-on booking is written by the browser *after* the charge clears
// (pages/api/tryOnBooking.ts), so there is nothing for this webhook to confirm
// — by the time the row exists it is already paid, emailed and couponed. All
// this does is notice when the row never arrives, which for try-ons is a real
// possibility rather than an impossibility: the slot can be taken in the
// seconds between charging and booking.
//
// The catch is that we race the browser. Stripe usually reaches us while that
// POST is still in flight, so a missing row means "not yet" far more often than
// it means "never". We throw rather than alert inside the grace window: Stripe
// takes the non-2xx as a retry signal and comes back later, by which point the
// row exists (nothing to do) or the window has closed (a genuine orphan). The
// event's timestamp is fixed at first delivery, so the window really does
// elapse across retries instead of restarting.
async function handleTryOnSucceeded(
  payment: Stripe.PaymentIntent,
  eventCreatedAt: number,
) {
  const booking = await getTryOnBookingByPaymentIntent(payment.id);
  if (booking) {
    return;
  }

  const secondsSincePayment = Math.floor(Date.now() / 1000) - eventCreatedAt;
  if (secondsSincePayment < TRY_ON_BOOKING_GRACE_SECONDS) {
    throw new Error(
      `Try-on booking for ${payment.id} not written yet after ${secondsSincePayment}s — asking Stripe to redeliver`,
    );
  }

  await alertOrphanedTryOnPayment(payment);
}

// A cancelled intent can never be confirmed again, so this is the one case
// where dropping the row outright is safe — the cancel that reconcileReservation
// would normally perform first has already happened, which is why we are being
// told about it.
async function handleCancelled(paymentIntentId: string) {
  const deleted = await BookingSchema.deleteOne({
    paymentIntent: paymentIntentId,
    paymentSuccess: { $ne: true },
    reservedAt: { $ne: null },
  });

  // Unconditionally, not only when a row was deleted: the claim can outlive its
  // reservation if the row went first, and an orphaned claim holds a coupon
  // hostage until it lapses.
  await releaseCouponClaims(paymentIntentId);

  if (deleted.deletedCount > 0) {
    console.log(`Released reservation for abandoned payment ${paymentIntentId}`);
  }
}

// A charge with no reservation behind it should now be unreachable: checkout
// reserves before it charges, and no reservation is ever deleted without its
// PaymentIntent being cancelled first.
//
// So this raises an alarm rather than moving money. An automatic refund would
// be guessing at the right resolution to a state we don't understand, and the
// point of the reserve-then-charge design is that refunds are never part of the
// normal machinery. If this fires, something upstream is charging customers
// without reserving, and that needs a person to look at it.
async function alertOrphanedPayment(payment: Stripe.PaymentIntent) {
  const amount = (payment.amount / 100).toFixed(2);
  const customer =
    payment.receipt_email ?? payment.metadata?.email ?? "unknown";

  console.error("Succeeded payment has no reservation behind it", {
    paymentIntent: payment.id,
    amount: payment.amount,
    email: customer,
  });

  await sendAdminAlert({
    subject: `ACTION NEEDED: $${amount} charged with no booking`,
    lines: [
      `Payment intent: ${payment.id}`,
      `Amount: $${amount} ${payment.currency?.toUpperCase()}`,
      `Customer: ${customer}`,
      "",
      "A payment succeeded with no reservation behind it, which should not be",
      "possible — checkout reserves before it charges, and a reservation is",
      "never removed without cancelling its payment first.",
      "",
      "Nothing has been refunded automatically. Decide whether to create the",
      "booking manually or refund this payment in the Stripe dashboard.",
      "",
      "If this repeats, checkout is charging customers without reserving.",
    ],
  });
}

// The try-on equivalent, and a milder one: this state is reachable by design,
// because a try-on charges before it books. The customer has paid and has no
// slot, most likely because someone else took it in between. Still no automatic
// refund — the usual resolution is to give them the slot, not their money back.
async function alertOrphanedTryOnPayment(payment: Stripe.PaymentIntent) {
  const amount = (payment.amount / 100).toFixed(2);
  const customer =
    payment.receipt_email ?? payment.metadata?.email ?? "unknown";

  console.error("Succeeded try-on payment has no booking behind it", {
    paymentIntent: payment.id,
    amount: payment.amount,
    email: customer,
  });

  await sendAdminAlert({
    subject: `ACTION NEEDED: $${amount} try-on charged with no booking`,
    lines: [
      `Payment intent: ${payment.id}`,
      `Amount: $${amount} ${payment.currency?.toUpperCase()}`,
      `Customer: ${customer}`,
      "",
      "A try-on payment succeeded but no try-on booking was ever written. The",
      "try-on flow charges before it books, so this happens when the booking",
      "step failed afterwards — usually the slot was taken in between.",
      "",
      "Nothing has been refunded automatically. Contact the customer, then",
      "either add their try-on by hand from the Try-Ons tab in /admin or refund",
      "the payment in the Stripe dashboard.",
    ],
  });
}

async function sendAdminAlert({
  subject,
  lines,
}: {
  subject: string;
  lines: string[];
}) {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY as string);

    await resend.emails.send({
      from: `Dress for Less <${process.env.RESEND_EMAIL_ADDRESS}>`,
      to: [ADMIN_NOTIFICATION_EMAIL],
      subject,
      text: lines.join("\n"),
    });
  } catch (err) {
    console.error("Failed to send admin alert", err);
  }
}
