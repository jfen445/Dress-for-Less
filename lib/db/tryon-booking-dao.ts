import { TryOnBookingSchema } from "./schema";

export async function getTakenTryOnSlots(date: String) {
  return TryOnBookingSchema.find(
    { date, paymentSuccess: true },
    "date timeSlot",
  );
}

export async function checkTryOnSlotTaken(date: String, timeSlot: String) {
  return TryOnBookingSchema.find({ date, timeSlot, paymentSuccess: true });
}

export async function getTryOnBookingByPaymentIntent(paymentIntent: String) {
  return TryOnBookingSchema.findOne(
    { paymentIntent },
    "userId name email phone date timeSlot price paymentIntent paymentSuccess status",
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
