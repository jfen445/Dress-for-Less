import { describe, expect, it } from "vitest";
import {
  DELIVERY_TAB_DAY_GROUPS,
  PICKUP_TAB_DAY_GROUPS,
  partitionThisWeek,
} from "../../../../lib/utils/bookingDayGroups";
import { bucketBookings } from "../../../../lib/utils/bookingBuckets";
import { auckland } from "../../../../lib/utils/timezone";
import { calculateReturnDate } from "../../../../lib/utils/bookingWindow";
import { Booking } from "../../../../common/types";
import { BookingStatus } from "../../../../common/enums/BookingStatus";
import { DeliveryType } from "../../../../common/enums/DeliveryType";

const booking = (
  orderNumber: string,
  dateBooked: string,
  returnDate: string,
  deliveryType: DeliveryType = DeliveryType.Delivery,
): Booking =>
  ({
    _id: orderNumber,
    orderNumber,
    userId: "u1",
    items: [
      {
        dressId: "d1",
        dateBooked,
        returnDate,
        blockedFrom: dateBooked,
        blockedUntil: returnDate,
        deliveryType,
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

const orderNumbers = (bookings: Booking[]) =>
  bookings.map((b) => b.orderNumber).sort();

// Tuesday 29th September 2026. This week therefore runs Mon 28th → Sun 4th
// October, and "last Friday" is the 25th — the exact shape that was being
// rendered under this week's Friday–Sunday heading.
const TUE_29_SEP = auckland.toZone("2026-09-29T10:00:00");

describe("partitionThisWeek", () => {
  // The regression. A Friday Post rental is due back the following Monday
  // (POST_RETURN_LAG_BY_WEEKDAY), so on the Tuesday after it is still inside
  // bucketBookings' "this week" — but its event date belongs to last week.
  it("demotes last week's still-out rental instead of filing it under this week", () => {
    const lastFriday = booking("DFL-0564", "2026-09-25", "2026-09-28");

    const { dayGroups, demotedToPrevious } = partitionThisWeek(
      [lastFriday],
      DELIVERY_TAB_DAY_GROUPS,
      TUE_29_SEP,
    );

    expect(orderNumbers(demotedToPrevious)).toEqual(["DFL-0564"]);
    expect(dayGroups).toEqual([]);
  });

  it("keeps this week's Friday–Sunday bookings under that heading", () => {
    const thisFriday = booking("DFL-9001", "2026-10-02", "2026-10-05");
    const thisSunday = booking("DFL-9002", "2026-10-04", "2026-10-05");

    const { dayGroups, demotedToPrevious } = partitionThisWeek(
      [thisFriday, thisSunday],
      DELIVERY_TAB_DAY_GROUPS,
      TUE_29_SEP,
    );

    expect(demotedToPrevious).toEqual([]);
    expect(dayGroups).toHaveLength(1);
    expect(dayGroups[0].label).toBe("Friday 2nd – Sunday 4th October (2)");
    expect(orderNumbers(dayGroups[0].bookings)).toEqual(["DFL-9001", "DFL-9002"]);
  });

  // A group's heading is built from this week's Monday, so a booking placed in
  // it must actually fall inside the dates that heading names. This is the
  // property the weekday index silently broke.
  it("places every booking inside the date range its own heading names", () => {
    // Includes last Friday and Saturday, still out and so still in thisWeek:
    // the dates a weekday index filed under this week's Friday–Sunday heading.
    const dates = [
      "2026-09-25",
      "2026-09-26",
      "2026-09-28",
      "2026-09-29",
      "2026-10-01",
      "2026-10-02",
      "2026-10-04",
    ];
    const bookings = dates.map((d, i) =>
      booking(`in-${i}`, d, calculateReturnDate(d, DeliveryType.Pickup)),
    );

    const { dayGroups } = partitionThisWeek(
      bookings,
      PICKUP_TAB_DAY_GROUPS,
      TUE_29_SEP,
    );

    // Monday the 28th is before today (Tuesday), so it demotes; the rest group.
    for (const group of dayGroups) {
      for (const b of group.bookings) {
        const day = auckland.toZone(b.items[0].dateBooked);
        const named = `${day.format("dddd")} ${day.date()}`;
        expect(group.label).toContain(named);
      }
    }
  });

  // The property the admin table depends on: a booking in neither list is
  // invisible on the page. Swept across the whole boundary, both tab layouts,
  // and every booking bucketBookings is willing to call "this week".
  it("returns every booking in exactly one of dayGroups or demotedToPrevious", () => {
    const candidates: Booking[] = [];
    for (let offset = -28; offset <= 28; offset++) {
      const date = TUE_29_SEP.add(offset, "day").format("YYYY-MM-DD");
      for (const dt of Object.values(DeliveryType)) {
        candidates.push(
          booking(`o${offset}-${dt}`, date, calculateReturnDate(date, dt), dt),
        );
      }
    }

    // Only what actually reaches the component: bucketBookings' thisWeek list.
    const { thisWeek } = bucketBookings(candidates, TUE_29_SEP);
    expect(thisWeek.length).toBeGreaterThan(0);

    for (const defs of [DELIVERY_TAB_DAY_GROUPS, PICKUP_TAB_DAY_GROUPS]) {
      const { dayGroups, demotedToPrevious } = partitionThisWeek(
        thisWeek,
        defs,
        TUE_29_SEP,
      );

      const placed = [
        ...dayGroups.flatMap((g) => g.bookings),
        ...demotedToPrevious,
      ].map((b) => b.orderNumber);

      expect(placed.sort()).toEqual(orderNumbers(thisWeek));
      expect(new Set(placed).size).toBe(thisWeek.length);
    }
  });

  // Evaluated on a Monday, todayIndex is 0, so nothing this week demotes —
  // the boundary where the old `idx < todayIndex` test could never fire.
  it("demotes nothing from the current week when run on the Monday", () => {
    const monday = auckland.toZone("2026-09-28T09:00:00");
    const bookings = ["2026-09-28", "2026-10-02", "2026-10-04"].map((d, i) =>
      booking(`m-${i}`, d, calculateReturnDate(d, DeliveryType.Delivery)),
    );

    const { dayGroups, demotedToPrevious } = partitionThisWeek(
      bookings,
      DELIVERY_TAB_DAY_GROUPS,
      monday,
    );

    expect(demotedToPrevious).toEqual([]);
    expect(dayGroups.flatMap((g) => g.bookings)).toHaveLength(3);
  });
});
