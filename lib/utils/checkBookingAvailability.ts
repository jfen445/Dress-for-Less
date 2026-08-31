import { getDressPricing } from "../../sanity/sanity.query";
import { getBookingAvailabilityByDress } from "../db/booking-dao";
import { isDateBlockedByExistingBooking } from "./bookingWindow";
import { DeliveryType } from "../../common/enums/DeliveryType";

// Server-side counterpart to the Calendar's disabledDays stock-count check —
// shared so the client and server can never disagree about what's bookable.
// Identifies one reservation for the purpose of ordering it against others.
export type ReservationRank = { reservedAt: string; paymentIntent: string };

type BlockingRow = {
  size: string;
  blockedFrom: string;
  blockedUntil: string;
  paymentSuccess?: boolean;
  reservedAt?: string;
  paymentIntent?: string;
};

// Does this existing row take precedence over the given reservation?
//
// A confirmed booking, or one predating the reservation scheme, always wins.
// Between two unpaid reservations the earlier one wins, with the payment intent
// breaking an exact tie. The ordering is total and depends on nothing local, so
// two checkouts racing for the same date independently reach the same verdict
// about which of them should give way — without which both would back out and
// neither would get the dress.
export function outranksReservation(
  row: BlockingRow,
  candidate: ReservationRank,
): boolean {
  if (row.paymentSuccess || !row.reservedAt) return true;
  if (row.reservedAt !== candidate.reservedAt) {
    return row.reservedAt < candidate.reservedAt;
  }
  return (row.paymentIntent ?? "") < candidate.paymentIntent;
}

export async function isBookingAvailable(
  dressId: string,
  size: string,
  dateBooked: string,
  deliveryType: DeliveryType,
  excludePaymentIntent?: string,
  // When supplied, only rows that outrank this reservation are counted. The
  // reserve uses it to re-check after writing, to settle a race it may have
  // lost to a checkout that started fractionally earlier.
  outranking?: ReservationRank,
): Promise<boolean> {
  const dress = await getDressPricing(dressId);
  if (!dress) return false;

  const stock = Number(dress[size.toLowerCase()] ?? 0);
  if (stock <= 0) return false;

  const existingBookings = await getBookingAvailabilityByDress(
    dressId,
    excludePaymentIntent,
  );
  const blockedCount = existingBookings.filter(
    (booking: BlockingRow) =>
      booking.size === size &&
      isDateBlockedByExistingBooking(dateBooked, deliveryType, booking) &&
      (!outranking || outranksReservation(booking, outranking)),
  ).length;

  return blockedCount < stock;
}
