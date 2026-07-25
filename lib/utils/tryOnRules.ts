import { Dayjs } from "dayjs";
import { auckland } from "./timezone";

// Bookings for a given try-on date close at 12pm the day before, e.g. a
// Wednesday session must be booked by Tuesday noon Auckland time.
function getTryOnBookingCutoff(dateStr: string): Dayjs {
  return auckland
    .toZone(dateStr)
    .subtract(1, "day")
    .hour(12)
    .minute(0)
    .second(0)
    .millisecond(0);
}

export function isTryOnBookingAllowedForDate(
  dateStr: string,
  now: Dayjs = auckland.now(),
): boolean {
  return now.isBefore(getTryOnBookingCutoff(dateStr));
}
