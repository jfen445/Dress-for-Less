import { BookingSchema } from "./schema";

const BOOKING_PROJECTION =
  "userId items totalPrice billingAddress tracking isShipped isReturned paymentIntent paymentSuccess status couponIds discountAmount orderNumber createdAt";

export async function getBookingAvailabilityByDress(dressId: String) {
  return BookingSchema.aggregate([
    { $unwind: "$items" },
    { $match: { "items.dressId": dressId } },
    {
      $project: {
        _id: 0,
        dressId: "$items.dressId",
        size: "$items.size",
        dateBooked: "$items.dateBooked",
        blockedFrom: "$items.blockedFrom",
        blockedUntil: "$items.blockedUntil",
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
) {
  const filter: Record<string, unknown> = {
    items: { $elemMatch: { dressId, size, dateBooked: date } },
  };
  if (excludeBookingId) {
    filter._id = { $ne: excludeBookingId };
  }
  return BookingSchema.find(filter, "items paymentIntent paymentSuccess status");
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
