import { describe, expect, it } from "vitest";
import {
  MAX_RENTAL_DAYS,
  calculateReturnDate,
  calculateWindowForEvent,
  calculateWindowForRange,
  isDateBlockedForEvent,
  isDateBlockedForRange,
  isReturnDayAllowed,
  rentalSpanDays,
} from "../../../../lib/utils/bookingWindow";
import { DeliveryType } from "../../../../common/enums/DeliveryType";

// A calendar week with every weekday represented, so each lookup table can be
// checked row by row. 2026-06-01 is a Monday.
const MON = "2026-06-01";
const TUE = "2026-06-02";
const WED = "2026-06-03";
const THU = "2026-06-04";
const FRI = "2026-06-05";
const SAT = "2026-06-06";
const SUN = "2026-06-07";

const addDays = (date: string, days: number) =>
  new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000)
    .toISOString()
    .slice(0, 10);

// Every row of tools/decisionmatrix.csv, read straight off the spreadsheet's
// own columns rather than re-derived from the offsets in bookingWindow.ts — so
// this fails if the code and the matrix ever disagree, which a table built from
// the code could not do. Dates are that CSV weekday within the week above.
//
//                    event  method                dispatch  return due  ready again
const MATRIX: [string, DeliveryType, string, string, string][] = [
  [MON, DeliveryType.Delivery, "2026-05-28", TUE, FRI],
  [TUE, DeliveryType.Delivery, "2026-05-28", WED, SAT],
  [WED, DeliveryType.Delivery, "2026-05-29", THU, SUN],
  [THU, DeliveryType.Delivery, "2026-06-01", FRI, "2026-06-10"],
  [FRI, DeliveryType.Delivery, "2026-06-03", "2026-06-08", "2026-06-10"],
  [SAT, DeliveryType.Delivery, "2026-06-03", "2026-06-08", "2026-06-10"],
  [SUN, DeliveryType.Delivery, "2026-06-03", "2026-06-08", "2026-06-10"],
  [MON, DeliveryType.Pickup, "2026-05-31", TUE, THU],
  [TUE, DeliveryType.Pickup, MON, WED, FRI],
  [WED, DeliveryType.Pickup, TUE, THU, SAT],
  [THU, DeliveryType.Pickup, WED, FRI, SUN],
  [FRI, DeliveryType.Pickup, THU, SAT, "2026-06-08"],
  [SAT, DeliveryType.Pickup, FRI, SUN, "2026-06-09"],
  [SUN, DeliveryType.Pickup, SAT, "2026-06-08", "2026-06-10"],
];

describe("the decision matrix, row by row", () => {
  it.each(MATRIX)(
    "%s %s: dispatch %s, due back %s, ready again %s",
    (eventDate, deliveryType, dispatch, returnDue, readyAgain) => {
      expect(calculateReturnDate(eventDate, deliveryType)).toBe(returnDue);
      expect(calculateWindowForEvent(eventDate, deliveryType)).toEqual({
        blockedFrom: dispatch,
        blockedUntil: readyAgain,
      });
    },
  );

  it("never has a Delivery booking due back at a weekend", () => {
    // The rule the admin override enforces, shown to be true of every derived
    // return date rather than only asserted about the picker. Computed here,
    // never read from MATRIX's expected column — checking the table against
    // itself would pass no matter what the lag table said.
    for (const eventDate of [MON, TUE, WED, THU, FRI, SAT, SUN]) {
      const returnDue = calculateReturnDate(eventDate, DeliveryType.Delivery);
      const weekday = new Date(`${returnDue}T00:00:00Z`).getUTCDay();

      expect(weekday, `${eventDate} returns ${returnDue}`).not.toBe(0);
      expect(weekday, `${eventDate} returns ${returnDue}`).not.toBe(6);
    }
  });

  it("always falls due after the event, never on it", () => {
    for (const [eventDate, deliveryType] of MATRIX) {
      expect(calculateReturnDate(eventDate, deliveryType) > eventDate).toBe(
        true,
      );
    }
  });
});

describe("turnaround is anchored on the return date, not the event", () => {
  // The whole reason the tables were re-cut. Thursday/Delivery is the row where
  // the two anchorings differ most: the dress is due back Friday and ready
  // again the following Wednesday, five days later. Anchor that five on the
  // event weekday instead and you get Sunday — the dress back on sale while it
  // is still in the post.
  it("gives a Thursday Delivery booking its full six days", () => {
    expect(calculateWindowForEvent(THU, DeliveryType.Delivery)).toEqual({
      blockedFrom: MON,
      blockedUntil: "2026-06-10",
    });
    expect(addDays(THU, 6)).toBe("2026-06-10");
  });

  it("holds an extended rental to its own return weekday", () => {
    // Wed event, held until it is due back on Friday: Friday's turnaround is
    // +5, so ready again 2026-06-10. Taking the turnaround from the event
    // weekday (Wed, +3) would say Monday 2026-06-08 and free it two days early.
    const { blockedUntil } = calculateWindowForRange(
      WED,
      FRI,
      DeliveryType.Delivery,
    );

    expect(blockedUntil).toBe("2026-06-10");
    expect(blockedUntil).not.toBe("2026-06-08");
  });

  it("anchors dispatch on the event date even when the return moves", () => {
    // Wed dispatch is −5 whatever the return date is; only the far end moves.
    for (const returnDate of [THU, FRI, SAT, "2026-06-30"]) {
      expect(
        calculateWindowForRange(WED, returnDate, DeliveryType.Delivery)
          .blockedFrom,
      ).toBe("2026-05-29");
    }
  });

  it("never lets a later return date free the dress sooner", () => {
    // The override picker offers a gapless run of dates and the server's range
    // check assumes conflicts are contiguous, only because this holds: pushing
    // the return out can move blockedUntil later or leave it, never earlier.
    let previous = "";

    for (let offset = 1; offset < 28; offset++) {
      const { blockedUntil } = calculateWindowForRange(
        MON,
        addDays(MON, offset),
        DeliveryType.Delivery,
      );

      expect(blockedUntil >= previous).toBe(true);
      previous = blockedUntil;
    }
  });
});

describe("isReturnDayAllowed", () => {
  // Both weekend days, separately: the derivation only ever produces Monday
  // returns off a weekend, so a gate that refused Sunday and waved Saturday
  // through would look correct everywhere except the one place it is used.
  it.each([
    [SAT, "Saturday"],
    [SUN, "Sunday"],
  ])("refuses a posted return on %s (%s)", (date) => {
    expect(isReturnDayAllowed(date, DeliveryType.Delivery)).toBe(false);
  });

  it.each([
    [MON, "Mon"],
    [TUE, "Tue"],
    [WED, "Wed"],
    [THU, "Thu"],
    [FRI, "Fri"],
  ])("allows a posted return on %s (%s)", (date) => {
    expect(isReturnDayAllowed(date, DeliveryType.Delivery)).toBe(true);
  });

  it("allows a drop-off return on any day, weekend included", () => {
    // The box on the doorstep is unattended, so no day is special.
    for (const date of [MON, TUE, WED, THU, FRI, SAT, SUN]) {
      expect(isReturnDayAllowed(date, DeliveryType.Pickup)).toBe(true);
    }
  });
});

describe("delivery-method fallbacks", () => {
  it("falls the unused Pickup/Delivery variants back to the Post tables", () => {
    const post = calculateWindowForEvent(THU, DeliveryType.Delivery);

    expect(calculateWindowForEvent(THU, DeliveryType.PickupDelivery)).toEqual(
      post,
    );
    expect(calculateWindowForEvent(THU, DeliveryType.DeliveryPickup)).toEqual(
      post,
    );
  });

  it("stores the conservative (day-before) Pickup dispatch, not the same-day option", () => {
    // The stored window has to overstate rather than understate how long the
    // dress is tied up — the optimistic figure is only ever used for candidates.
    expect(
      calculateWindowForEvent(THU, DeliveryType.Pickup).blockedFrom,
    ).toBe(WED);
  });
});

describe("isDateBlockedForEvent", () => {
  // Mon delivery: unavailable 2026-05-28 through 2026-06-05.
  const existing = calculateWindowForEvent(MON, DeliveryType.Delivery);

  it("blocks a candidate whose window overlaps", () => {
    expect(isDateBlockedForEvent(THU, DeliveryType.Pickup, existing)).toBe(
      true,
    );
  });

  it("does not block when the candidate's dispatch is exactly blockedUntil", () => {
    // Pickup candidates dispatch same-day (optimistic), so 06-05's dispatch is
    // 06-05 — equal to blockedUntil, which the window treats as clear.
    expect(existing.blockedUntil).toBe(FRI);
    expect(isDateBlockedForEvent(FRI, DeliveryType.Pickup, existing)).toBe(
      false,
    );
  });

  it("does not block when the candidate is ready again exactly on blockedFrom", () => {
    // Pickup ready-again is +3 days; 2026-05-25 + 3 = 2026-05-28 = blockedFrom.
    expect(existing.blockedFrom).toBe("2026-05-28");
    expect(
      isDateBlockedForEvent("2026-05-25", DeliveryType.Pickup, existing),
    ).toBe(false);
    expect(
      isDateBlockedForEvent("2026-05-26", DeliveryType.Pickup, existing),
    ).toBe(true);
  });

  it("uses optimistic Pickup timing for the candidate, unlike the stored window", () => {
    // The asymmetry, stated as a single assertion: the same date that is
    // *available* as a candidate would, if stored, have started blocking a day
    // earlier. Collapse the two figures and this test fails.
    expect(isDateBlockedForEvent(FRI, DeliveryType.Pickup, existing)).toBe(
      false,
    );
    expect(
      calculateWindowForEvent(FRI, DeliveryType.Pickup).blockedFrom,
    ).toBe(THU);
    expect(THU < existing.blockedUntil).toBe(true);
  });
});

describe("isDateBlockedForRange", () => {
  const existing = calculateWindowForEvent(MON, DeliveryType.Delivery);

  it("agrees with isDateBlockedForEvent on a derived return date", () => {
    // The event form is the range form with the derivation applied, so any
    // disagreement here means one of them has grown its own rules.
    for (const date of [MON, TUE, WED, THU, FRI, SAT, SUN]) {
      for (const method of [DeliveryType.Delivery, DeliveryType.Pickup]) {
        expect(
          isDateBlockedForRange(
            date,
            calculateReturnDate(date, method),
            method,
            existing,
          ),
        ).toBe(isDateBlockedForEvent(date, method, existing));
      }
    }
  });

  it("blocks when holding the dress longer reaches into an existing window", () => {
    // 2026-05-25 due back 05-26 is ready again exactly on blockedFrom, which
    // counts as clear. One more day pushes ready-again past that boundary.
    expect(
      isDateBlockedForRange(
        "2026-05-25",
        "2026-05-26",
        DeliveryType.Pickup,
        existing,
      ),
    ).toBe(false);

    expect(
      isDateBlockedForRange(
        "2026-05-25",
        "2026-05-27",
        DeliveryType.Pickup,
        existing,
      ),
    ).toBe(true);
  });

  it("takes the candidate's turnaround from its return weekday, not its event", () => {
    // A Wed event due back Friday is ready again 2026-06-10; anchoring on the
    // event weekday says 06-08, which wrongly clears a booking that starts
    // blocking 06-09.
    const blocksFrom09 = {
      blockedFrom: "2026-06-09",
      blockedUntil: "2026-06-20",
    };

    expect(
      isDateBlockedForRange(WED, FRI, DeliveryType.Delivery, blocksFrom09),
    ).toBe(true);
  });

  it("stays clear for any return date once the event starts after the window", () => {
    // Dispatch is what clears an existing booking on the near side, and that
    // depends only on the event date — so extending the return cannot
    // reintroduce a conflict the event date already cleared.
    for (const returnDate of [SAT, SUN, "2026-06-30"]) {
      expect(
        isDateBlockedForRange(FRI, returnDate, DeliveryType.Pickup, existing),
      ).toBe(false);
    }
  });
});

describe("rentalSpanDays", () => {
  it("counts both ends", () => {
    expect(rentalSpanDays(MON, TUE)).toBe(2);
    expect(rentalSpanDays(MON, SUN)).toBe(7);
    expect(rentalSpanDays(MON, addDays(MON, MAX_RENTAL_DAYS - 1))).toBe(
      MAX_RENTAL_DAYS,
    );
  });

  it("measures event date to return date, so a normal booking spans two", () => {
    // Not one: the ceiling now includes the day the dress is in transit back.
    expect(
      rentalSpanDays(MON, calculateReturnDate(MON, DeliveryType.Delivery)),
    ).toBe(2);
  });
});
