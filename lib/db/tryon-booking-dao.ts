import { auckland } from "../utils/timezone";
import { TryOnBookingSchema } from "./schema";
import { createCoupon } from "./coupon-dao";
import { CouponType } from "../../common/enums/CouponType";
import {
  TRY_ON_COUPON_AMOUNT,
  TRY_ON_COUPON_VALID_DAYS,
} from "../../common/constants/tryOn";

// Every row takes its slot, paid or not — an unpaid reservation acting as a
// hold is the whole mechanism by which the try-on flow secures an appointment
// before charging for it.
//
// Note there is deliberately no expiry here. A hold stops blocking when its row
// is deleted, and a row is only deleted once its PaymentIntent has been
// cancelled (see lib/tryOn/reconcileTryOnReservation.ts). Freeing a slot on a
// timer while its payment was still confirmable is precisely how an appointment
// ends up sold twice: the hold stops counting, somebody else takes the slot, and
// then the original payment lands.
export async function getTakenTryOnSlots(date: String) {
  return TryOnBookingSchema.find({ date }, "date timeSlot");
}

// excludePaymentIntent lets a checkout ignore its own in-flight reservation, so
// that re-reserving after a declined card doesn't report the customer's own hold
// back to them as somebody else's booking.
export async function checkTryOnSlotTaken(
  date: String,
  timeSlot: String,
  excludePaymentIntent?: string,
) {
  const filter: Record<string, unknown> = { date, timeSlot };

  if (excludePaymentIntent) {
    filter.paymentIntent = { $ne: excludePaymentIntent };
  }

  return TryOnBookingSchema.find(filter);
}

// This customer's own live, unpaid hold on the given slot, excluding the one the
// current attempt is using.
//
// Needed because a customer otherwise blocks themselves: they reserve, their
// card is declined, they come back later on a fresh PaymentIntent, and their own
// ghost hold tells them the slot is taken. The caller reconciles what this
// returns rather than deleting it — those holds still have live PaymentIntents
// behind them, which have to be cancelled before the rows can safely go.
export async function findOwnTryOnHolds(
  userId: string,
  date: String,
  timeSlot: String,
  excludePaymentIntent: string,
): Promise<string[]> {
  const holds = await TryOnBookingSchema.find(
    {
      userId,
      date,
      timeSlot,
      paymentSuccess: { $ne: true },
      reservedAt: { $ne: null },
      paymentIntent: { $ne: excludePaymentIntent },
    },
    "paymentIntent",
  );

  return holds.map((h) => h.paymentIntent as string);
}

// Holds that have outlived their window and need reconciling against Stripe —
// used by the sweep and, on demand, by a reserve that finds itself blocked by
// one.
export async function findLapsedTryOnReservations(
  cutoff: string,
): Promise<string[]> {
  const lapsed = await TryOnBookingSchema.find(
    {
      paymentSuccess: { $ne: true },
      reservedAt: { $ne: null, $lt: cutoff },
    },
    "paymentIntent",
  );

  return lapsed.map((r) => r.paymentIntent as string);
}

// Narrow on purpose: only ever removes an unpaid row that the reserve step
// wrote. A confirmed booking, or an admin-created row, is never touched however
// this is called.
export async function deleteTryOnReservation(paymentIntent: string) {
  return TryOnBookingSchema.deleteOne({
    paymentIntent,
    paymentSuccess: { $ne: true },
    reservedAt: { $ne: null },
  });
}

export async function getTryOnBookingByPaymentIntent(paymentIntent: String) {
  return TryOnBookingSchema.findOne(
    { paymentIntent },
    "userId name email phone date timeSlot price paymentIntent paymentSuccess reservedAt status",
  );
}

export async function getTryOnBookingsByUser(userId: String) {
  return TryOnBookingSchema.find(
    { userId },
    "date timeSlot price status createdAt",
  );
}

export async function getAllTryOnBookings() {
  return TryOnBookingSchema.aggregate([
    { $sort: { date: 1, timeSlot: 1 } },
    {
      $lookup: {
        from: "allusers",
        localField: "userId",
        foreignField: "_id",
        as: "user",
      },
    },
  ]);
}

export async function updateTryOnBookingStatus(
  bookingId: String,
  status: String,
) {
  return TryOnBookingSchema.updateOne({ _id: bookingId }, { $set: { status } });
}

export async function deleteTryOnBooking(bookingId: String) {
  return TryOnBookingSchema.findByIdAndDelete(bookingId);
}

export async function grantTryOnCoupon(userId: string, date: string) {
  const startDate = auckland.startOfDay(date);
  const expiryDate = startDate
    .add(TRY_ON_COUPON_VALID_DAYS, "day")
    .endOf("day");

  return createCoupon({
    userId,
    discountAmount: TRY_ON_COUPON_AMOUNT,
    discountType: CouponType.Flat,
    startDate: startDate.toISOString(),
    expiryDate: expiryDate.toISOString(),
  });
}
