import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
import {
  calculateReturnDate,
  calculateWindowForEvent,
  calculateWindowForRange,
} from "../../../lib/utils/bookingWindow";
import { DeliveryType } from "../../../common/enums/DeliveryType";

// scripts/ runs outside the Next build, so migrate-return-dates.js carries its
// own plain-JS copy of the timing tables. This compares that copy against the
// live TypeScript rather than against constants of its own — the migration's
// pre-write self-check validates itself against these tables, so if they drift
// it would happily confirm a wrong return date and write it.
const require = createRequire(import.meta.url);
const script = require("../../../scripts/migrate-return-dates.js");

const EVERY_WEEKDAY = [
  "2026-06-01",
  "2026-06-02",
  "2026-06-03",
  "2026-06-04",
  "2026-06-05",
  "2026-06-06",
  "2026-06-07",
];

const METHODS = [DeliveryType.Delivery, DeliveryType.Pickup];

describe("migrate-return-dates.js agrees with lib/utils/bookingWindow.ts", () => {
  it("derives the same return date for every weekday and method", () => {
    for (const eventDate of EVERY_WEEKDAY) {
      for (const method of METHODS) {
        expect(
          script.calculateReturnDate(eventDate, method),
          `${eventDate} ${method}`,
        ).toBe(calculateReturnDate(eventDate, method));
      }
    }
  });

  it("computes the same stored window for every weekday and method", () => {
    for (const eventDate of EVERY_WEEKDAY) {
      for (const method of METHODS) {
        expect(
          script.calculateWindowForEvent(eventDate, method),
          `${eventDate} ${method}`,
        ).toEqual(calculateWindowForEvent(eventDate, method));
      }
    }
  });

  it("computes the same window for an explicitly chosen return date", () => {
    // Covers the turnaround table on return weekdays the derivation never
    // produces for Delivery — the admin-override case the migration would meet
    // if an extended booking existed before it ran.
    for (const eventDate of EVERY_WEEKDAY) {
      for (const method of METHODS) {
        for (let offset = 1; offset <= 14; offset++) {
          const returnDate = new Date(
            Date.parse(`${eventDate}T00:00:00Z`) + offset * 86_400_000,
          )
            .toISOString()
            .slice(0, 10);

          expect(
            script.calculateWindowForRange(eventDate, returnDate, method),
            `${eventDate} → ${returnDate} ${method}`,
          ).toEqual(calculateWindowForRange(eventDate, returnDate, method));
        }
      }
    }
  });

  it("treats the deliveryType string case-insensitively, as stored rows do", () => {
    // The enum's value is "Pickup"; the script lowercases before comparing, so
    // a row written with any casing resolves to the same timings.
    for (const stored of ["Pickup", "pickup", "PICKUP"]) {
      expect(script.calculateReturnDate("2026-06-05", stored)).toBe(
        calculateReturnDate("2026-06-05", DeliveryType.Pickup),
      );
    }
  });
});

describe("returnDateForItem", () => {
  it("derives from the event date on a normal row", () => {
    expect(
      script.returnDateForItem({
        dateBooked: "2026-06-05",
        deliveryType: DeliveryType.Delivery,
      }),
    ).toBe("2026-06-08");
  });

  it("ignores an endDate equal to the event date", () => {
    // Every row written by the reserve carries endDate === dateBooked.
    expect(
      script.returnDateForItem({
        dateBooked: "2026-06-05",
        endDate: "2026-06-05",
        deliveryType: DeliveryType.Delivery,
      }),
    ).toBe("2026-06-08");
  });

  it("measures from an extended endDate, not the event date", () => {
    // No production row has one, but shortening a real extended rental to the
    // event date's return would put the dress back on sale while out.
    expect(
      script.returnDateForItem({
        dateBooked: "2026-06-01",
        endDate: "2026-06-05",
        deliveryType: DeliveryType.Delivery,
      }),
    ).toBe("2026-06-08");
  });
});

describe("returnDateForItem is safe to re-run", () => {
  it("keeps an existing returnDate rather than re-deriving it", () => {
    // The second run, after the new code is live. An admin override is later
    // than the derived date by definition, so re-deriving would drag it back.
    expect(
      script.returnDateForItem({
        dateBooked: "2026-06-01",
        returnDate: "2026-06-19",
        deliveryType: DeliveryType.Delivery,
      }),
    ).toBe("2026-06-19");
  });

  it("still derives when there is no returnDate", () => {
    expect(
      script.returnDateForItem({
        dateBooked: "2026-06-01",
        deliveryType: DeliveryType.Delivery,
      }),
    ).toBe("2026-06-02");
  });
});
