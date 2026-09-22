import { auckland } from "./timezone";
import { DeliveryType } from "../../common/enums/DeliveryType";

// The tables below are transcribed from tools/decisionmatrix.csv — one each
// from its "Initial dispatch / collection", "Return due" and "Ready again"
// columns.

// Days before the event date that a Post booking is dispatched, keyed by the
// event's weekday. Tuesday uses the matrix's "preferred" 5-day figure rather
// than its Friday fallback.
const POST_DISPATCH_OFFSET_BY_WEEKDAY: Record<number, number> = {
  1 /* Mon */: 4,
  2 /* Tue */: 5,
  3 /* Wed */: 5,
  4 /* Thu */: 3,
  5 /* Fri */: 2,
  6 /* Sat */: 3,
  0 /* Sun */: 4,
};

// Days from the event date to the date a Post booking is due back, keyed by the
// event's weekday. Friday, Saturday and Sunday events all land on the following
// Monday, so no Post booking is ever due back at a weekend.
const POST_RETURN_LAG_BY_WEEKDAY: Record<number, number> = {
  1 /* Mon */: 1,
  2 /* Tue */: 1,
  3 /* Wed */: 1,
  4 /* Thu */: 1,
  5 /* Fri */: 3,
  6 /* Sat */: 2,
  0 /* Sun */: 1,
};

// Days from the return date to the date the dress can go out again, keyed by
// the *return* date's weekday. Saturday and Sunday are unreachable through the
// lag table above and are refused by the admin override, but are defined so the
// lookup is total — a missing entry produces an Invalid Date and a window that
// blocks nothing. Both take Monday's figure, as a weekend return would arrive.
const POST_TURNAROUND_FROM_RETURN_BY_WEEKDAY: Record<number, number> = {
  1 /* Mon */: 2,
  2 /* Tue */: 3,
  3 /* Wed */: 3,
  4 /* Thu */: 3,
  5 /* Fri */: 5,
  6 /* Sat */: 4,
  0 /* Sun */: 3,
};

// Pickup timing is flat across weekdays: collected the day before the event or
// on the day itself, due back the next day, out again two days after that. The
// two dispatch figures are selected by the `optimistic` flag below.
const PICKUP_RETURN_LAG_DAYS = 1;
const PICKUP_TURNAROUND_FROM_RETURN_DAYS = 2;
const PICKUP_DISPATCH_OFFSET_DAYS = { conservative: 1, optimistic: 0 };

// Largest permitted span from event date to return date, in days.
export const MAX_RENTAL_DAYS = 90;

export type BookingWindow = { blockedFrom: string; blockedUntil: string };

// Only DeliveryType.Pickup takes the Pickup figures. Delivery and the unused
// PickupDelivery/DeliveryPickup variants all read the Post tables.
const isPickup = (deliveryType: DeliveryType) =>
  deliveryType === DeliveryType.Pickup;

// The date a booking made for `eventDate` is due back with us — by 1pm for
// Post, 8pm for drop-off. Always at least one day after the event.
export function calculateReturnDate(
  eventDate: string,
  deliveryType: DeliveryType,
): string {
  const day = auckland.toZone(eventDate);
  const lag = isPickup(deliveryType)
    ? PICKUP_RETURN_LAG_DAYS
    : POST_RETURN_LAG_BY_WEEKDAY[day.day()];
  return day.add(lag, "day").format("YYYY-MM-DD");
}

// Whether a return date is one we can accept. A Post return is lodged over an
// NZ Post counter, which is shut at weekends; a drop-off goes into an
// unattended box, so any day works. The derived dates never violate this — only
// an admin override can.
export function isReturnDayAllowed(
  returnDate: string,
  deliveryType: DeliveryType,
): boolean {
  if (isPickup(deliveryType)) return true;
  const weekday = auckland.toZone(returnDate).day();
  return weekday !== 0 && weekday !== 6;
}

// Days before the event date that the dress leaves us. `optimistic` selects
// same-day Pickup collection over the day before; it has no effect on Post.
function dispatchOffsetDays(
  eventDate: string,
  deliveryType: DeliveryType,
  optimistic = false,
): number {
  if (isPickup(deliveryType)) {
    return optimistic
      ? PICKUP_DISPATCH_OFFSET_DAYS.optimistic
      : PICKUP_DISPATCH_OFFSET_DAYS.conservative;
  }
  return POST_DISPATCH_OFFSET_BY_WEEKDAY[auckland.toZone(eventDate).day()];
}

// Days after the return date before the dress is available again — the trip
// back, the clean and the pack.
function turnaroundFromReturnDays(
  returnDate: string,
  deliveryType: DeliveryType,
): number {
  if (isPickup(deliveryType)) return PICKUP_TURNAROUND_FROM_RETURN_DAYS;
  return POST_TURNAROUND_FROM_RETURN_BY_WEEKDAY[
    auckland.toZone(returnDate).day()
  ];
}

// Days from `eventDate` to `returnDate`, counting both ends. Used only for the
// MAX_RENTAL_DAYS ceiling.
export function rentalSpanDays(eventDate: string, returnDate: string): number {
  return (
    auckland.toZone(returnDate).diff(auckland.toZone(eventDate), "day") + 1
  );
}

// blockedFrom is `eventDate` minus the dispatch offset; blockedUntil is
// `returnDate` plus the turnaround. The near end therefore moves with the
// event, the far end with the return.
const windowFor = (
  eventDate: string,
  returnDate: string,
  deliveryType: DeliveryType,
  optimistic: boolean,
): BookingWindow => ({
  blockedFrom: auckland
    .toZone(eventDate)
    .subtract(dispatchOffsetDays(eventDate, deliveryType, optimistic), "day")
    .format("YYYY-MM-DD"),
  blockedUntil: auckland
    .toZone(returnDate)
    .add(turnaroundFromReturnDays(returnDate, deliveryType), "day")
    .format("YYYY-MM-DD"),
});

// The window to store for a booking whose return date is the derived one —
// every customer booking, and any admin booking without an override. Uses the
// conservative (day-before) Pickup dispatch, so the stored window is the widest
// the booking could occupy.
export function calculateWindowForEvent(
  eventDate: string,
  deliveryType: DeliveryType,
): BookingWindow {
  return windowFor(
    eventDate,
    calculateReturnDate(eventDate, deliveryType),
    deliveryType,
    false,
  );
}

// The same window for an explicitly chosen return date, as set by the admin
// override. Paired with calculateWindowForEvent, which derives that date
// instead of taking it.
export function calculateWindowForRange(
  eventDate: string,
  returnDate: string,
  deliveryType: DeliveryType,
): BookingWindow {
  return windowFor(eventDate, returnDate, deliveryType, false);
}

// True when a candidate booking of `eventDate`, returning on its derived return
// date, overlaps `existingWindow` — i.e. the candidate's own window neither
// ends on or before the existing one starts, nor starts on or after it ends.
export function isDateBlockedForEvent(
  eventDate: string,
  deliveryType: DeliveryType,
  existingWindow: BookingWindow,
): boolean {
  return isDateBlockedForRange(
    eventDate,
    calculateReturnDate(eventDate, deliveryType),
    deliveryType,
    existingWindow,
  );
}

// The same overlap test for an explicitly chosen return date. The candidate's
// window is built with optimistic (same-day) Pickup dispatch, so it is the
// narrowest window the candidate could occupy — the opposite of the widest one
// stored for an existing booking.
export function isDateBlockedForRange(
  eventDate: string,
  returnDate: string,
  deliveryType: DeliveryType,
  existingWindow: BookingWindow,
): boolean {
  const candidate = windowFor(eventDate, returnDate, deliveryType, true);

  const isAfterExisting = candidate.blockedFrom >= existingWindow.blockedUntil;
  const isBeforeExisting = candidate.blockedUntil <= existingWindow.blockedFrom;
  return !(isAfterExisting || isBeforeExisting); // YYYY-MM-DD sorts lexicographically
}
