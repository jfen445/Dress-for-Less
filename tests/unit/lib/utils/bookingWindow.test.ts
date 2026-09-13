import { describe, expect, it } from "vitest";
import {
  MAX_RENTAL_DAYS,
  calculateBookingWindow,
  isDateBlockedByExistingBooking,
  rentalSpanDays,
} from "../../../../lib/utils/bookingWindow";
import { DeliveryType } from "../../../../common/enums/DeliveryType";

// A calendar week with every weekday represented, so the Post lookup table can
// be checked row by row. 2026-06-01 is a Monday.
const MON = "2026-06-01";
const TUE = "2026-06-02";
const WED = "2026-06-03";
const THU = "2026-06-04";
const FRI = "2026-06-05";
const SAT = "2026-06-06";
const SUN = "2026-06-07";

describe("calculateBookingWindow — Delivery", () => {
  // Transcribed independently from tools/decisionmatrix.csv via the offsets in
  // bookingWindow.ts, so a change to the table has to be a deliberate one.
  it.each([
    [MON, "Mon", "2026-05-28", "2026-06-05"],
    [TUE, "Tue", "2026-05-28", "2026-06-06"],
    [WED, "Wed", "2026-05-29", "2026-06-07"],
    [THU, "Thu", "2026-06-01", "2026-06-10"],
    [FRI, "Fri", "2026-06-03", "2026-06-10"],
    [SAT, "Sat", "2026-06-03", "2026-06-10"],
    [SUN, "Sun", "2026-06-03", "2026-06-10"],
  ])(
    "%s (%s) blocks %s → %s",
    (date, _weekday, blockedFrom, blockedUntil) => {
      expect(calculateBookingWindow(date, date, DeliveryType.Delivery)).toEqual({
        blockedFrom,
        blockedUntil,
      });
    },
  );

  it("falls the unused Pickup/Delivery variants back to the Post table", () => {
    const post = calculateBookingWindow(THU, THU, DeliveryType.Delivery);

    expect(calculateBookingWindow(THU, THU, DeliveryType.PickupDelivery)).toEqual(post);
    expect(calculateBookingWindow(THU, THU, DeliveryType.DeliveryPickup)).toEqual(post);
  });
});

describe("calculateBookingWindow — Pickup", () => {
  it("is constant regardless of weekday: day before, ready 3 days after", () => {
    for (const date of [MON, TUE, WED, THU, FRI, SAT, SUN]) {
      const { blockedFrom, blockedUntil } = calculateBookingWindow(
        date,
        date,
        DeliveryType.Pickup,
      );
      const dayMs = 86_400_000;
      const event = Date.parse(`${date}T00:00:00Z`);

      expect(Date.parse(`${blockedFrom}T00:00:00Z`)).toBe(event - dayMs);
      expect(Date.parse(`${blockedUntil}T00:00:00Z`)).toBe(event + 3 * dayMs);
    }
  });

  it("stores the conservative (day-before) dispatch, not the same-day option", () => {
    // The stored window has to overstate rather than understate how long the
    // dress is tied up — the optimistic figure is only ever used for candidates.
    expect(calculateBookingWindow(THU, THU, DeliveryType.Pickup).blockedFrom).toBe(WED);
  });
});

describe("isDateBlockedByExistingBooking", () => {
  // Mon delivery: unavailable 2026-05-28 through 2026-06-05.
  const existing = calculateBookingWindow(MON, MON, DeliveryType.Delivery);

  it("blocks a candidate whose window overlaps", () => {
    expect(
      isDateBlockedByExistingBooking(THU, THU, DeliveryType.Pickup, existing),
    ).toBe(true);
  });

  it("does not block when the candidate's dispatch is exactly blockedUntil", () => {
    // Pickup candidates dispatch same-day (optimistic), so 06-05's dispatch is
    // 06-05 — equal to blockedUntil, which the window treats as clear.
    expect(existing.blockedUntil).toBe(FRI);
    expect(
      isDateBlockedByExistingBooking(FRI, FRI, DeliveryType.Pickup, existing),
    ).toBe(false);
  });

  it("blocks one day earlier than that boundary", () => {
    expect(
      isDateBlockedByExistingBooking(THU, THU, DeliveryType.Pickup, existing),
    ).toBe(true);
  });

  it("does not block when the candidate is ready again exactly on blockedFrom", () => {
    // Pickup ready-again is +3 days; 2026-05-25 + 3 = 2026-05-28 = blockedFrom.
    expect(existing.blockedFrom).toBe("2026-05-28");
    expect(
      isDateBlockedByExistingBooking("2026-05-25", "2026-05-25", DeliveryType.Pickup, existing),
    ).toBe(false);
    expect(
      isDateBlockedByExistingBooking("2026-05-26", "2026-05-26", DeliveryType.Pickup, existing),
    ).toBe(true);
  });

  it("uses optimistic Pickup timing for the candidate, unlike the stored window", () => {
    // The asymmetry, stated as a single assertion: the same date that is
    // *available* as a candidate would, if stored, have started blocking a day
    // earlier. Collapse the two figures and this test fails.
    expect(
      isDateBlockedByExistingBooking(FRI, FRI, DeliveryType.Pickup, existing),
    ).toBe(false);
    expect(calculateBookingWindow(FRI, FRI, DeliveryType.Pickup).blockedFrom).toBe(THU);
    expect(THU < existing.blockedUntil).toBe(true);
  });
});

const addDays = (date: string, days: number) =>
  new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000)
    .toISOString()
    .slice(0, 10);

describe("calculateBookingWindow — extended ranges", () => {
  // The single-date table above now runs through the range signature as
  // (d, d, type), so it doubles as the proof that a normal booking is just the
  // degenerate case. What follows is what only a real range can show.

  it("anchors dispatch on the start date and turnaround on the end date", () => {
    // Wed dispatch is −5 (2026-05-29); Fri turnaround is +5 (2026-06-10).
    expect(calculateBookingWindow(WED, FRI, DeliveryType.Delivery)).toEqual({
      blockedFrom: "2026-05-29",
      blockedUntil: "2026-06-10",
    });
  });

  it("does not take the turnaround from the start weekday", () => {
    // Wed's turnaround is +4 and Fri's is +5, so anchoring the offset on the
    // start still lands on the end date — just one day early, at 2026-06-09,
    // with the wash and pack not yet done. Naming that value is the guard.
    const { blockedUntil } = calculateBookingWindow(WED, FRI, DeliveryType.Delivery);

    expect(blockedUntil).not.toBe("2026-06-09");
  });

  it("never lets a later end date free the dress sooner", () => {
    // The end-date picker offers a gapless run of dates, and the server's range
    // check assumes conflicts are contiguous, only because this holds: pushing
    // the end out can move blockedUntil later or leave it, never earlier.
    let previous = "";

    for (let offset = 0; offset < 28; offset++) {
      const { blockedUntil } = calculateBookingWindow(
        MON,
        addDays(MON, offset),
        DeliveryType.Delivery,
      );

      expect(blockedUntil >= previous).toBe(true);
      previous = blockedUntil;
    }
  });
});

describe("isDateBlockedByExistingBooking — ranges", () => {
  // Mon delivery: unavailable 2026-05-28 through 2026-06-05.
  const existing = calculateBookingWindow(MON, MON, DeliveryType.Delivery);

  it("blocks when holding the dress longer reaches into an existing window", () => {
    // 2026-05-25 on its own is ready again exactly on blockedFrom, which counts
    // as clear. Keeping it one day longer pushes ready-again past that boundary.
    expect(
      isDateBlockedByExistingBooking(
        "2026-05-25",
        "2026-05-25",
        DeliveryType.Pickup,
        existing,
      ),
    ).toBe(false);

    expect(
      isDateBlockedByExistingBooking(
        "2026-05-25",
        "2026-05-26",
        DeliveryType.Pickup,
        existing,
      ),
    ).toBe(true);
  });

  it("takes the candidate's turnaround from its end weekday, not its start", () => {
    // Pickup cannot show this — its turnaround is a flat +3 either way. Only
    // Delivery can, where Wed is +4 and Fri is +5. A Wed→Fri range is ready
    // again on 2026-06-10; anchoring on the start says 06-09, which wrongly
    // clears a booking that starts blocking that very day.
    const blocksFrom09 = { blockedFrom: "2026-06-09", blockedUntil: "2026-06-20" };

    expect(
      isDateBlockedByExistingBooking(WED, FRI, DeliveryType.Delivery, blocksFrom09),
    ).toBe(true);
  });

  it("stays clear for any end date once the range starts after the window", () => {
    // Dispatch is what clears an existing booking on the near side, and that
    // depends only on the start — so extending the end cannot reintroduce a
    // conflict that the start already cleared.
    for (const end of [FRI, SAT, SUN, "2026-06-30"]) {
      expect(
        isDateBlockedByExistingBooking(FRI, end, DeliveryType.Pickup, existing),
      ).toBe(false);
    }
  });
});

describe("rentalSpanDays", () => {
  it("counts a same-day rental as one day", () => {
    expect(rentalSpanDays(MON, MON)).toBe(1);
  });

  it("counts both ends", () => {
    expect(rentalSpanDays(MON, SUN)).toBe(7);
    expect(rentalSpanDays(MON, addDays(MON, MAX_RENTAL_DAYS - 1))).toBe(
      MAX_RENTAL_DAYS,
    );
  });
});
