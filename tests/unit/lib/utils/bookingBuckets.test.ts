import { describe, expect, it } from "vitest";
import { bucketBookings } from "../../../../lib/utils/bookingBuckets";
import { auckland } from "../../../../lib/utils/timezone";
import { Booking } from "../../../../common/types";
import { BookingStatus } from "../../../../common/enums/BookingStatus";

// 2026-09-21 is a Monday, so it is simultaneously the day the current week
// opens and a bookable date — the collision this suite exists to pin.
const MON = "2026-09-21";
const WED = "2026-09-23";
const SUN = "2026-09-27";

const booking = (
  orderNumber: string,
  dateBooked: string,
  endDate?: string,
): Booking =>
  ({
    _id: orderNumber,
    orderNumber,
    userId: "u1",
    items: [
      {
        dressId: "d1",
        dateBooked,
        ...(endDate ? { endDate } : {}),
        blockedFrom: dateBooked,
        blockedUntil: dateBooked,
        deliveryType: "Pickup",
        size: "L",
        price: 30,
      },
    ],
    totalPrice: 30,
    billingAddress: {},
    tracking: "",
    isShipped: false,
    isReturned: false,
    paymentIntent: "pi_1",
    status: BookingStatus.NA,
  }) as unknown as Booking;

// Mid-week, so "this week" runs Mon 21st → Sun 27th September.
const midWeek = auckland.toZone("2026-09-23T10:00:00");

const orderNumbers = (bookings: Booking[]) =>
  bookings.map((b) => b.orderNumber);

describe("bucketBookings", () => {
  it("keeps a booking ending on the week's opening Monday in thisWeek", () => {
    const { thisWeek, upcoming, past } = bucketBookings(
      [booking("DFL-1", MON, MON)],
      midWeek,
    );

    expect(orderNumbers(thisWeek)).toEqual(["DFL-1"]);
    expect(upcoming).toEqual([]);
    expect(past).toEqual([]);
  });

  // The same tie, on a booking written before endDate existed — endOf falls
  // back to dateBooked, so dropping the field does not dodge the boundary.
  it("keeps a legacy booking with no endDate on that Monday in thisWeek", () => {
    const { thisWeek, past } = bucketBookings([booking("DFL-2", MON)], midWeek);

    expect(orderNumbers(thisWeek)).toEqual(["DFL-2"]);
    expect(past).toEqual([]);
  });

  it("files a booking that ended before the week opened in past", () => {
    const { thisWeek, past } = bucketBookings(
      [booking("DFL-3", "2026-09-20", "2026-09-20")],
      midWeek,
    );

    expect(orderNumbers(past)).toEqual(["DFL-3"]);
    expect(thisWeek).toEqual([]);
  });

  it("files a booking starting after the week closes in upcoming", () => {
    const { thisWeek, upcoming } = bucketBookings(
      [booking("DFL-4", "2026-09-28", "2026-09-28")],
      midWeek,
    );

    expect(orderNumbers(upcoming)).toEqual(["DFL-4"]);
    expect(thisWeek).toEqual([]);
  });

  it("keeps an extended rental still out this week in thisWeek", () => {
    const { thisWeek } = bucketBookings(
      [booking("DFL-5", "2026-09-01", WED)],
      midWeek,
    );

    expect(orderNumbers(thisWeek)).toEqual(["DFL-5"]);
  });

  // The property the three buckets exist to hold. A booking in none of them is
  // invisible in the admin table *and* unfindable by search, which reads the
  // concatenation of the three.
  it("places every booking in exactly one bucket across the whole boundary", () => {
    const dates = [
      "2026-09-18",
      "2026-09-19",
      "2026-09-20",
      MON,
      "2026-09-22",
      WED,
      "2026-09-26",
      SUN,
      "2026-09-28",
      "2026-10-05",
    ];
    const bookings = dates.flatMap((date, i) => [
      booking(`with-end-${i}`, date, date),
      booking(`no-end-${i}`, date),
    ]);

    const { thisWeek, upcoming, past } = bucketBookings(bookings, midWeek);

    const placed = [...thisWeek, ...upcoming, ...past].map((b) => b.orderNumber);
    expect(placed.slice().sort()).toEqual(
      bookings.map((b) => b.orderNumber).sort(),
    );
    expect(new Set(placed).size).toBe(bookings.length);
  });

  // Sunday is the one day where now.day() === 0, taking the other branch of the
  // currentSunday calculation — the week must still be Mon 21st → Sun 27th.
  it("computes the same week when evaluated on the Sunday itself", () => {
    const onSunday = auckland.toZone("2026-09-27T18:00:00");
    const { thisWeek } = bucketBookings(
      [booking("DFL-6", MON, MON), booking("DFL-7", SUN, SUN)],
      onSunday,
    );

    expect(orderNumbers(thisWeek).sort()).toEqual(["DFL-6", "DFL-7"]);
  });
});
