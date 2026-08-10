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
import { formatBookingDate } from "../../../lib/utils/formatBookingDate";
import { getCouponsByIds, redeemCoupons } from "../../../lib/db/coupon-dao";
import { getNextOrderNumber } from "../../../lib/utils/orderNumber";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);
const FREE_COUPON_CHECKOUT_PREFIX = "FREE_COUPON_";
const ADMIN_NOTIFICATION_EMAIL = "dressforlessnz@gmail.com";

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

    const { booking: updatedBooking, alreadyConfirmed } =
      await confirmReservation(intent, {
        name: session.user?.name ?? "",
        email: session.user?.email ?? "",
      });

    if (alreadyConfirmed) {
      return res
        .status(200)
        .json({ message: "No bookings updated", booking: updatedBooking });
    }

    return res
      .status(200)
      .json({ message: "Update successful", booking: updatedBooking });
  } catch (err) {
    console.error("paymentConfirm error", err);
    return res.status(500).json({ message: "Update Error" });
  }
}

// Turns a paid-for reservation into a real booking: marks it paid, redeems the
// coupon slots it was holding, allocates its order number, clears the cart and
// sends the receipt.
//
// Callers must have established that the payment succeeded — this does not
// check Stripe itself, because its two callers already know: the webhook is
// told by Stripe, and /api/payment/paymentConfirm verifies before calling.
//
// Safe to call repeatedly and concurrently. The guard on paymentSuccess means
// exactly one call wins the write; every other call reports alreadyConfirmed
// and does nothing, so a customer can't be emailed twice or a coupon redeemed
// twice when the browser and the webhook arrive together.
export async function confirmReservation(
  intent: string,
  customer?: { name?: string; email?: string },
): Promise<{ booking?: Booking; alreadyConfirmed: boolean }> {
  // Claim the confirmation first, and only then spend a number on it. Doing it
  // the other way round burns one per caller rather than one per booking: the
  // browser and the webhook routinely arrive together, both allocate, and the
  // loser's number is thrown away — which is why the sequence had gaps.
  const result = await BookingSchema.updateMany(
    { paymentIntent: intent, paymentSuccess: { $ne: true } },
    { $set: { paymentSuccess: true } },
  );

  if (result.modifiedCount === 0) {
    const [already] = (await getBookingsByPaymentIntent(intent)) as Booking[];
    return { booking: already, alreadyConfirmed: true };
  }

  // Past the guard, so this call is the sole confirmer and the allocation
  // happens exactly once. Still conditional on not already having a number:
  // a legacy or admin-created row arriving here keeps the one it came with.
  const [confirmed] = (await getBookingsByPaymentIntent(intent)) as Booking[];

  if (confirmed && !confirmed.orderNumber) {
    const orderNumber = await getNextOrderNumber();
    await BookingSchema.updateMany(
      { paymentIntent: intent },
      { $set: { orderNumber } },
    );
  }

  const updatedBookings = await getBookingsByPaymentIntent(intent);
  const updatedBooking = updatedBookings[0] as Booking | undefined;

  if (updatedBooking) {
    // Turn the held coupon slots into permanent redemptions. This is the
    // point of no return for a coupon — up to here the slot was only on
    // loan, and any failure handed it back. Passing the intent lets the same
    // write drop the claim as it records the redemption, so the slot is never
    // counted twice, once as held and once as spent.
    const couponIds = updatedBooking.couponIds ?? [];
    if (couponIds.length > 0) {
      const coupons = await getCouponsByIds(couponIds);
      await redeemCoupons(coupons, String(updatedBooking.userId), intent);
    }

    for (const item of updatedBooking.items) {
      await removeItemFromCartByFields(
        updatedBooking.userId,
        item.dressId,
        item.dateBooked,
        item.size,
      );
    }

    // Best-effort: puts the order number and customer on the Stripe
    // dashboard so it can be read without cross-referencing the DB. Never
    // block confirmation on it — the payment has already succeeded.
    if (!intent.startsWith(FREE_COUPON_CHECKOUT_PREFIX)) {
      await stripe.paymentIntents
        .update(intent, {
          metadata: {
            orderNumber: updatedBooking.orderNumber ?? "",
            name: customer?.name ?? "",
            email: customer?.email ?? "",
          },
        })
        .catch((err) =>
          console.error("Failed to attach order metadata to Stripe payment", err),
        );
    }

    await sendEmailConfirmation(updatedBooking);
  }

  return { booking: updatedBooking, alreadyConfirmed: false };
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

  // Best-effort internal notification — a failure here shouldn't affect the
  // customer's own confirmation email, which has already been sent above.
  try {
    const primaryItem = orderReceipt[0];
    const dressNames = orderReceipt.map((item) => item.dressName).join(", ");
    const subject = primaryItem
      ? `${user.name} booked ${dressNames} on ${formatBookingDate(primaryItem.dateBooked)} (${primaryItem.deliveryType})`
      : "You received an order";

    await resend.emails.send({
      from: `Dress for Less <${process.env.RESEND_EMAIL_ADDRESS}>`,
      to: [ADMIN_NOTIFICATION_EMAIL],
      subject,
      react: OrderReceiptEmail({ orderReceipt }),
    });
  } catch (error) {
    console.error("Failed to send admin order notification", error);
  }
}
