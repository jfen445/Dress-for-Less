import { auckland } from "./timezone";
import { DeliveryType } from "../../common/enums/DeliveryType";

// Transcribed from tools/decisionmatrix.csv. Tuesday/Post uses the "preferred"
// 5-day offset, not the "Friday fallback" — never actually the answer in any
// row of the matrix, so unverifiable either way, but "preferred" is the
// stated default and is used consistently for both existing and candidate.
const POST_TIMING_BY_WEEKDAY: Record<
  number,
  { dispatchOffsetDays: number; turnaroundOffsetDays: number }
> = {
  1 /* Mon */: { dispatchOffsetDays: 4, turnaroundOffsetDays: 4 },
  2 /* Tue */: { dispatchOffsetDays: 5, turnaroundOffsetDays: 4 },
  3 /* Wed */: { dispatchOffsetDays: 5, turnaroundOffsetDays: 4 },
  4 /* Thu */: { dispatchOffsetDays: 3, turnaroundOffsetDays: 6 },
  5 /* Fri */: { dispatchOffsetDays: 2, turnaroundOffsetDays: 5 },
  6 /* Sat */: { dispatchOffsetDays: 3, turnaroundOffsetDays: 4 },
  0 /* Sun */: { dispatchOffsetDays: 4, turnaroundOffsetDays: 3 },
};

// Every Pickup row is "Collect [day before] or [event day]" with a ready-again
// date exactly 3 days after the event, regardless of weekday. The dispatch
// offset depends on role: the earlier/conservative option (1 day before) when
// storing an existing booking's window (protects against understating how
// long it's unavailable), the later/optimistic option (0, same day) when
// checking whether a candidate date is available (same-day collection is
// always a valid fallback, so it determines true earliest availability).
const PICKUP_TURNAROUND_OFFSET_DAYS = 3;
const PICKUP_DISPATCH_OFFSET_DAYS = { conservative: 1, optimistic: 0 };

// Ceiling on an extended rental
export const MAX_RENTAL_DAYS = 90;

export type BookingWindow = { blockedFrom: string; blockedUntil: string };

function getTiming(
  dateBooked: string,
  deliveryType: DeliveryType,
  optimistic = false,
) {
  if (deliveryType === DeliveryType.Pickup) {
    return {
      dispatchOffsetDays: optimistic
        ? PICKUP_DISPATCH_OFFSET_DAYS.optimistic
        : PICKUP_DISPATCH_OFFSET_DAYS.conservative,
      turnaroundOffsetDays: PICKUP_TURNAROUND_OFFSET_DAYS,
    };
  }
  // Delivery, and the currently-unused PickupDelivery/DeliveryPickup variants
  // (no rows for them in the matrix), fall back to the Post/Delivery table.
  return POST_TIMING_BY_WEEKDAY[auckland.toZone(dateBooked).day()];
}

// Inclusive of both ends, so a normal one-day rental spans 1.
export function rentalSpanDays(startDate: string, endDate: string): number {
  return auckland.toZone(endDate).diff(auckland.toZone(startDate), "day") + 1;
}

// A booking runs startDate → endDate; the two are equal for a normal rental,
// and an extended one just moves the end out. Dispatch is anchored on the
// start, turnaround on the END — the turnaround offset covers the return trip
// and cleaning, so anchoring it on the start would free the dress days before
// the customer has even sent it back.
//
// Always conservative — used when a booking is actually created/stored, so
// its stored window represents the full span it realistically ties up the
// dress, regardless of what gets booked around it.
export function calculateBookingWindow(
  startDate: string,
  endDate: string,
  deliveryType: DeliveryType,
): BookingWindow {
  const { dispatchOffsetDays } = getTiming(startDate, deliveryType);
  const { turnaroundOffsetDays } = getTiming(endDate, deliveryType);
  return {
    blockedFrom: auckland
      .toZone(startDate)
      .subtract(dispatchOffsetDays, "day")
      .format("YYYY-MM-DD"),
    blockedUntil: auckland
      .toZone(endDate)
      .add(turnaroundOffsetDays, "day")
      .format("YYYY-MM-DD"),
  };
}

// Is the candidate range blocked by one existing booking's stored window?
// Uses optimistic (same-day) Pickup dispatch timing for the candidate side —
// we want to know if ANY valid handover timing makes the range work, not the
// conservative worst case used to store existing bookings.
export function isDateBlockedByExistingBooking(
  candidateStart: string,
  candidateEnd: string,
  candidateDeliveryType: DeliveryType,
  existingWindow: BookingWindow,
): boolean {
  const { dispatchOffsetDays } = getTiming(
    candidateStart,
    candidateDeliveryType,
    true,
  );
  const { turnaroundOffsetDays } = getTiming(
    candidateEnd,
    candidateDeliveryType,
    true,
  );

  const candidateDispatch = auckland
    .toZone(candidateStart)
    .subtract(dispatchOffsetDays, "day")
    .format("YYYY-MM-DD");
  const candidateReadyAgain = auckland
    .toZone(candidateEnd)
    .add(turnaroundOffsetDays, "day")
    .format("YYYY-MM-DD");

  const isAfterExisting = candidateDispatch >= existingWindow.blockedUntil;
  const isBeforeExisting = candidateReadyAgain <= existingWindow.blockedFrom;
  return !(isAfterExisting || isBeforeExisting); // YYYY-MM-DD sorts lexicographically
}
