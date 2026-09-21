import type { Dayjs } from "dayjs";
import { Booking } from "../../common/types";
import { auckland } from "./timezone";

export type BookingBuckets = {
  thisWeek: Booking[];
  upcoming: Booking[];
  past: Booking[];
};

// A booking's dates are naive "YYYY-MM-DD" strings, so every one of these
// resolves to midnight Auckland. That matters for the boundary comparisons
// below: the week's start is also midnight, so the two can land on the exact
// same instant and a strict comparison drops the booking.
const primaryDate = (booking: Booking) => booking.items[0]?.dateBooked;
const startOf = (booking: Booking) => auckland.toZone(primaryDate(booking));
// Falls back to the start date: endDate only exists on bookings written since
// the field was added, and equals dateBooked unless an admin extended it.
const endOf = (booking: Booking) =>
  auckland.toZone(booking.items[0]?.endDate ?? primaryDate(booking));

// Sorts bookings into the three lists the admin table renders. Every booking
// must land in exactly one — anything falling through all three vanishes from
// the table *and* from search, which reads the concatenation of the three.
//
// `now` is injectable so the week boundaries can be pinned in tests.
export function bucketBookings(
  bookings: Booking[],
  now: Dayjs = auckland.now(),
): BookingBuckets {
  // now.day(): Sunday = 0, Monday = 1, ..., Saturday = 6
  const currentSunday = (
    now.day() === 0 ? now : now.add(7 - now.day(), "day")
  ).endOf("day");
  const previousMonday = now
    .subtract((now.day() + 6) % 7, "day")
    .startOf("day");

  const sorted = [...bookings]
    .filter((booking) => booking.items?.length)
    .sort((a, b) => startOf(a).diff(startOf(b)));

  // An extended rental is "this week" for as long as it is out, so this tests
  // the whole span rather than only the day it began — otherwise a rental that
  // started three weeks ago and is still in a customer's wardrobe sits in the
  // archive table.
  //
  // The end is compared with `!isBefore` rather than `isAfter`: a booking
  // ending *on* the Monday that opens the week ties with previousMonday to the
  // millisecond, and under a strict `isAfter` it failed this test, failed
  // `upcoming` (it isn't after Sunday) and failed `past` (it isn't before
  // Monday) — so a whole day's bookings disappeared from the table for a week.
  const overlapsThisWeek = (booking: Booking) =>
    startOf(booking).isBefore(currentSunday) &&
    !endOf(booking).isBefore(previousMonday);

  const thisWeek = sorted.filter(overlapsThisWeek);

  const upcoming = sorted.filter(
    (booking) =>
      !overlapsThisWeek(booking) && startOf(booking).isAfter(currentSunday),
  );

  // The exact complement of overlapsThisWeek's end test, which is what makes
  // the three exhaustive: a booking that isn't this week either ended before
  // the week opened, or starts after it closes.
  const past = sorted
    .filter(
      (booking) =>
        !overlapsThisWeek(booking) && endOf(booking).isBefore(previousMonday),
    )
    .sort((a, b) => startOf(b).diff(startOf(a)));

  return { thisWeek, upcoming, past };
}
