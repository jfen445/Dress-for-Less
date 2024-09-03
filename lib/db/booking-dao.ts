import { BookingSchema } from "./schema";

export async function getBookingsByDress(dressId: String) {
  return BookingSchema.find(
    { dressId },
    "dressId userId address blockOutPeriod city createdAt dateBooked deliveryType isReturned isShipped paymentSuccess postCode tracking size"
  );
}

export async function checkDuplicateBooking(
  dressId: String,
  size: String,
  date: String
) {
  return BookingSchema.find(
    { dressId: dressId, size: size, dateBooked: date },
    "dressId userId address blockOutPeriod city createdAt dateBooked deliveryType isReturned isShipped paymentSuccess postCode tracking size"
  );
}
