import { getDressPricing } from "../../sanity/sanity.query";
import { getBookingAvailabilityByDress } from "../db/booking-dao";
import { isDateBlockedByExistingBooking } from "./bookingWindow";
import { DeliveryType } from "../../common/enums/DeliveryType";

// Server-side counterpart to the Calendar's disabledDays stock-count check —
// shared so the client and server can never disagree about what's bookable.
// Identifies one reservation for the purpose of ordering it against others.
export type ReservationRank = { reservedAt: string; paymentIntent: string };

export type BlockingRow = {
  dressId: string;
  size: string;
  blockedFrom: string;
  blockedUntil: string;
  bookingId?: string;
  orderNumber?: string;
  dateBooked?: string;
  endDate?: string;
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
  // Which dress a row is for has no bearing on the ordering, so it isn't asked
  // for: this settles precedence between two reservations, not availability.
  row: Omit<BlockingRow, "dressId">,
  candidate: ReservationRank,
): boolean {
  if (row.paymentSuccess || !row.reservedAt) return true;
  if (row.reservedAt !== candidate.reservedAt) {
    return row.reservedAt < candidate.reservedAt;
  }
  return (row.paymentIntent ?? "") < candidate.paymentIntent;
}

export type AvailabilityCheck = {
  available: boolean;
  stock: number;
  // The rows standing in the way, so a caller can say which booking conflicts
  // rather than only that something does.
  blocking: BlockingRow[];
};

export type AvailabilityOptions = {
  excludePaymentIntent?: string;
  // When supplied, only rows that outrank this reservation are counted. The
  // reserve uses it to re-check after writing, to settle a race it may have
  // lost to a checkout that started fractionally earlier.
  outranking?: ReservationRank;
  // Set by the admin edit path so a booking doesn't collide with itself.
  excludeBookingId?: string;
  // Rows that are not in the database yet — the other lines of the same admin
  // request. Without these, two overlapping lines in one submission would each
  // be checked against a world that does not contain the other, and both pass.
  alsoConsider?: BlockingRow[];
};

// startDate/endDate are equal for a normal booking; an extended one moves the
// end out, which widens the window the candidate has to fit into.
export async function findBlockingBookings(
  dressId: string,
  size: string,
  startDate: string,
  endDate: string,
  deliveryType: DeliveryType,
  options: AvailabilityOptions = {},
): Promise<AvailabilityCheck> {
  const { excludePaymentIntent, outranking, excludeBookingId, alsoConsider } =
    options;

  const dress = await getDressPricing(dressId);
  if (!dress) return { available: false, stock: 0, blocking: [] };

  const stock = Number(dress[size.toLowerCase()] ?? 0);
  if (stock <= 0) return { available: false, stock: 0, blocking: [] };

  const existingBookings = await getBookingAvailabilityByDress(
    dressId,
    excludePaymentIntent,
    excludeBookingId,
  );

  // The dress must be compared explicitly: the DAO query is already scoped to
  // one dress, but alsoConsider carries every line of the caller's request, so
  // without this a sibling line for a *different* dress blocks on size alone.
  const blocking = [...existingBookings, ...(alsoConsider ?? [])].filter(
    (booking: BlockingRow) =>
      booking.dressId === dressId &&
      booking.size === size &&
      isDateBlockedByExistingBooking(startDate, endDate, deliveryType, booking) &&
      (!outranking || outranksReservation(booking, outranking)),
  );

  return { available: blocking.length < stock, stock, blocking };
}

export async function isBookingAvailable(
  dressId: string,
  size: string,
  startDate: string,
  endDate: string,
  deliveryType: DeliveryType,
  excludePaymentIntent?: string,
  outranking?: ReservationRank,
  excludeBookingId?: string,
): Promise<boolean> {
  const { available } = await findBlockingBookings(
    dressId,
    size,
    startDate,
    endDate,
    deliveryType,
    { excludePaymentIntent, outranking, excludeBookingId },
  );
  return available;
}
