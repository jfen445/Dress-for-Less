import { PipelineStage } from "mongoose";
import { BookingSchema } from "./schema";
import { auckland } from "../utils/timezone";

const BOOKING_PROJECTION =
  "userId items totalPrice billingAddress tracking isShipped isReturned paymentIntent paymentSuccess reservedAt status couponIds discountAmount orderNumber createdAt";

// Every booking row blocks its date, paid or not — an unpaid reservation acting
// as a hold is the whole mechanism by which checkout secures a dress before
// charging for it.
//
// Note there is deliberately no expiry here. A hold stops blocking when its row
// is deleted, and a row is only deleted once its PaymentIntent has been
// cancelled (see lib/booking/reconcileReservation.ts). Releasing a date on a
// timer while its payment was still confirmable is precisely how a dress ends
// up booked twice: the hold stops counting, somebody else takes the date, and
// then the original 3DS challenge completes.
//
// excludePaymentIntent lets a checkout ignore its own in-flight reservation, so
// that re-reserving after a declined card doesn't report the customer's own
// hold back to them as a conflict.
export async function getBookingAvailabilityByDress(
  dressId: String,
  excludePaymentIntent?: string,
) {
  const pipeline: PipelineStage[] = [];

  if (excludePaymentIntent) {
    pipeline.push({ $match: { paymentIntent: { $ne: excludePaymentIntent } } });
  }

  pipeline.push(
    { $unwind: "$items" },
    { $match: { "items.dressId": dressId } },
    {
      $project: {
        _id: 0,
        paymentIntent: 1,
        paymentSuccess: 1,
        reservedAt: 1,
        dressId: "$items.dressId",
        size: "$items.size",
        dateBooked: "$items.dateBooked",
        blockedFrom: "$items.blockedFrom",
        blockedUntil: "$items.blockedUntil",
      },
    },
  );

  return BookingSchema.aggregate(pipeline);
}

// Every currently-active booking item across all dresses — i.e. where today
// falls within that item's stored blockedFrom/blockedUntil window. One query
// for the whole catalogue rather than one per dress, since a dress can have
// more than one size concurrently active and the caller groups by dressId.
export async function getCurrentlyActiveBookingsByDress() {
  const today = auckland.now().format("YYYY-MM-DD");
  return BookingSchema.aggregate([
    { $unwind: "$items" },
    {
      $match: {
        paymentSuccess: true,
        "items.blockedFrom": { $lte: today },
        "items.blockedUntil": { $gte: today },
      },
    },
    {
      $project: {
        _id: 0,
        dressId: "$items.dressId",
        size: "$items.size",
        status: 1,
      },
    },
  ]);
}

export async function getBookingsByUser(userId: String) {
  return BookingSchema.find({ userId }, BOOKING_PROJECTION);
}

export async function getBookingsById(bookingId: String) {
  return BookingSchema.findOne({ _id: bookingId }, BOOKING_PROJECTION);
}

export async function getBookingsByPaymentIntent(paymentIntent: String) {
  return BookingSchema.find({ paymentIntent }, BOOKING_PROJECTION);
}

export async function checkDuplicateBooking(
  dressId: String,
  size: String,
  date: String,
  excludeBookingId?: String,
  excludePaymentIntent?: string,
) {
  const filter: Record<string, unknown> = {
    items: { $elemMatch: { dressId, size, dateBooked: date } },
  };
  if (excludeBookingId) {
    filter._id = { $ne: excludeBookingId };
  }
  if (excludePaymentIntent) {
    filter.paymentIntent = { $ne: excludePaymentIntent };
  }
  return BookingSchema.find(
    filter,
    "items paymentIntent paymentSuccess reservedAt status",
  );
}

// This customer's own live, unpaid reservations covering any of the given
// dress/size/date combinations, excluding the one the current attempt is using.
//
// Needed because a customer otherwise blocks themselves: they reserve, their
// card is declined, and their own ghost hold tells them the dress is already
// booked when they try again. The caller reconciles what this returns rather
// than deleting it — those reservations still have live PaymentIntents behind
// them, which have to be cancelled before the rows can safely go.
export async function findOwnBookingHolds(
  userId: string,
  items: { dressId: String; size?: String; dateBooked: String }[],
  excludePaymentIntent: string,
): Promise<string[]> {
  if (items.length === 0) return [];

  const holds = await BookingSchema.find(
    {
      userId,
      paymentSuccess: { $ne: true },
      reservedAt: { $ne: null },
      paymentIntent: { $ne: excludePaymentIntent },
      items: {
        $elemMatch: {
          $or: items.map((item) => ({
            dressId: item.dressId,
            size: item.size,
            dateBooked: item.dateBooked,
          })),
        },
      },
    },
    "paymentIntent",
  );

  return holds.map((h) => h.paymentIntent as string);
}

// Reservations that have outlived their window and need reconciling against
// Stripe — used by the sweep and, on demand, by a reserve that finds itself
// blocked by one.
export async function findLapsedReservations(
  cutoff: string,
): Promise<string[]> {
  const lapsed = await BookingSchema.find(
    {
      paymentSuccess: { $ne: true },
      reservedAt: { $ne: null, $lt: cutoff },
    },
    "paymentIntent",
  );

  return lapsed.map((r) => r.paymentIntent as string);
}

export async function deleteBooking(bookingId: String) {
  return BookingSchema.findByIdAndDelete(bookingId);
}

export async function removeBookingItem(bookingId: String, itemId: String) {
  const booking = await BookingSchema.findById(bookingId);
  if (!booking) return null;

  if (booking.items.length <= 1) {
    return BookingSchema.findByIdAndDelete(bookingId);
  }

  return BookingSchema.findByIdAndUpdate(
    bookingId,
    { $pull: { items: { _id: itemId } } },
    { new: true },
  );
}

export async function getAllBookings() {
  return BookingSchema.aggregate([
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

export async function getBookingsByDateRange(startDate: string, endDate: string) {
  return BookingSchema.aggregate([
    {
      $match: {
        paymentSuccess: true,
        items: { $elemMatch: { dateBooked: { $gte: startDate, $lte: endDate } } },
      },
    },
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
