import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import { Booking } from "../../common/types";
import { auckland } from "./timezone";
import { formatBookingDate, getOrdinalSuffix } from "./formatBookingDate";

export type DayGroupDef = { id: string; minIndex: number; maxIndex: number };

export type DayGroup = { id: string; label: string; bookings: Booking[] };

export type ThisWeekPartition = {
  dayGroups: DayGroup[];
  demotedToPrevious: Booking[];
};

// Post dispatches Friday, Saturday and Sunday events together, so the admin
// packs them as one group; Pickup collections are per-day.
export const DELIVERY_TAB_DAY_GROUPS: DayGroupDef[] = [
  { id: "mon", minIndex: 0, maxIndex: 0 },
  { id: "tue", minIndex: 1, maxIndex: 1 },
  { id: "wed", minIndex: 2, maxIndex: 2 },
  { id: "thu", minIndex: 3, maxIndex: 3 },
  { id: "fri-sun", minIndex: 4, maxIndex: 6 },
];

export const PICKUP_TAB_DAY_GROUPS: DayGroupDef[] = [
  { id: "mon", minIndex: 0, maxIndex: 0 },
  { id: "tue", minIndex: 1, maxIndex: 1 },
  { id: "wed", minIndex: 2, maxIndex: 2 },
  { id: "thu", minIndex: 3, maxIndex: 3 },
  { id: "fri", minIndex: 4, maxIndex: 4 },
  { id: "sat", minIndex: 5, maxIndex: 5 },
  { id: "sun", minIndex: 6, maxIndex: 6 },
];

// Monday-first weekday index: 0=Monday...6=Sunday.
export const getMondayFirstDayIndex = (date: dayjs.ConfigType): number =>
  (auckland.toZone(date).day() + 6) % 7;

export const formatBookingDateRange = (
  start: dayjs.ConfigType,
  end: dayjs.ConfigType,
): string => {
  const s = auckland.toZone(start);
  const e = auckland.toZone(end);
  const startLabel = `${s.format("dddd")} ${s.date()}${getOrdinalSuffix(s.date())}`;
  const endLabel = `${e.format("dddd")} ${e.date()}${getOrdinalSuffix(e.date())} ${e.format("MMMM")}`;
  return s.month() !== e.month()
    ? `${startLabel} ${s.format("MMMM")} – ${endLabel}`
    : `${startLabel} – ${endLabel}`;
};

// Splits this week's bookings into the per-day groups the admin table heads,
// plus the ones that belong above it under "Previous". Every booking handed in
// comes back in exactly one of the two — a booking in neither is invisible in
// the table, which is the whole point of the fallback below.
//
// `now` is injectable so the week boundaries can be pinned in tests.
export function partitionThisWeek(
  bookings: Booking[],
  dayGroupDefs: DayGroupDef[],
  now: Dayjs = auckland.now(),
): ThisWeekPartition {
  const todayIndex = getMondayFirstDayIndex(now);
  const thisWeekMonday = now.subtract(todayIndex, "day").startOf("day");

  const buckets = dayGroupDefs.map((def) => ({
    ...def,
    bookings: [] as Booking[],
  }));
  const demoted: Booking[] = [];

  // Offset in days from this week's Monday, not a weekday index: bucketBookings
  // keeps a booking here while it is still *out* (it compares returnDate), so a
  // last-Friday rental due back this Monday legitimately arrives — and under a
  // weekday index it landed in this week's Friday group, labelled with a date it
  // had nothing to do with.
  bookings.forEach((booking) => {
    const offset = auckland
      .toZone(booking.items[0]?.dateBooked)
      .startOf("day")
      .diff(thisWeekMonday, "day");
    if (offset < todayIndex) {
      demoted.push(booking);
      return;
    }
    // Fallback keeps an out-of-range date in the table rather than dropping it
    // silently; bucketBookings' own filter should make it unreachable.
    const bucket =
      buckets.find((b) => offset >= b.minIndex && offset <= b.maxIndex) ??
      buckets[buckets.length - 1];
    bucket.bookings.push(booking);
  });

  const dayGroups = buckets
    .filter((b) => b.bookings.length > 0)
    .map((b) => ({
      id: b.id,
      bookings: b.bookings,
      label: `${
        b.minIndex === b.maxIndex
          ? formatBookingDate(thisWeekMonday.add(b.minIndex, "day"))
          : formatBookingDateRange(
              thisWeekMonday.add(b.minIndex, "day"),
              thisWeekMonday.add(b.maxIndex, "day"),
            )
      } (${b.bookings.length})`,
    }));

  return { dayGroups, demotedToPrevious: demoted };
}
