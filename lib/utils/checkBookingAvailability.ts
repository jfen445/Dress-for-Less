import { getDress } from "../../sanity/sanity.query";
import { getBookingAvailabilityByDress } from "../db/booking-dao";
import { isDateBlockedByExistingBooking } from "./bookingWindow";
import { DeliveryType } from "../../common/enums/DeliveryType";

// Server-side counterpart to the Calendar's disabledDays stock-count check —
// shared so the client and server can never disagree about what's bookable.
export async function isBookingAvailable(
  dressId: string,
  size: string,
  dateBooked: string,
  deliveryType: DeliveryType,
): Promise<boolean> {
  const dress = await getDress(dressId);
  if (!dress) return false;

  const stock = Number(dress[size.toLowerCase()] ?? 0);
  if (stock <= 0) return false;

  const existingBookings = await getBookingAvailabilityByDress(dressId);
  const blockedCount = existingBookings.filter(
    (booking: { size: string; blockedFrom: string; blockedUntil: string }) =>
      booking.size === size &&
      isDateBlockedByExistingBooking(dateBooked, deliveryType, booking),
  ).length;

  return blockedCount < stock;
}
