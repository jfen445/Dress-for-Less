import { describe, expect, it } from "vitest";
import {
  calculateBookingWindow,
  isDateBlockedByExistingBooking,
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
      expect(calculateBookingWindow(date, DeliveryType.Delivery)).toEqual({
        blockedFrom,
        blockedUntil,
      });
    },
  );

  it("falls the unused Pickup/Delivery variants back to the Post table", () => {
    const post = calculateBookingWindow(THU, DeliveryType.Delivery);

    expect(calculateBookingWindow(THU, DeliveryType.PickupDelivery)).toEqual(post);
    expect(calculateBookingWindow(THU, DeliveryType.DeliveryPickup)).toEqual(post);
  });
});

describe("calculateBookingWindow — Pickup", () => {
  it("is constant regardless of weekday: day before, ready 3 days after", () => {
    for (const date of [MON, TUE, WED, THU, FRI, SAT, SUN]) {
      const { blockedFrom, blockedUntil } = calculateBookingWindow(
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
    expect(calculateBookingWindow(THU, DeliveryType.Pickup).blockedFrom).toBe(WED);
  });
});

describe("isDateBlockedByExistingBooking", () => {
  // Mon delivery: unavailable 2026-05-28 through 2026-06-05.
  const existing = calculateBookingWindow(MON, DeliveryType.Delivery);

  it("blocks a candidate whose window overlaps", () => {
    expect(
      isDateBlockedByExistingBooking(THU, DeliveryType.Pickup, existing),
    ).toBe(true);
  });

  it("does not block when the candidate's dispatch is exactly blockedUntil", () => {
    // Pickup candidates dispatch same-day (optimistic), so 06-05's dispatch is
    // 06-05 — equal to blockedUntil, which the window treats as clear.
    expect(existing.blockedUntil).toBe(FRI);
    expect(
      isDateBlockedByExistingBooking(FRI, DeliveryType.Pickup, existing),
    ).toBe(false);
  });

  it("blocks one day earlier than that boundary", () => {
    expect(
      isDateBlockedByExistingBooking(THU, DeliveryType.Pickup, existing),
    ).toBe(true);
  });

  it("does not block when the candidate is ready again exactly on blockedFrom", () => {
    // Pickup ready-again is +3 days; 2026-05-25 + 3 = 2026-05-28 = blockedFrom.
    expect(existing.blockedFrom).toBe("2026-05-28");
    expect(
      isDateBlockedByExistingBooking("2026-05-25", DeliveryType.Pickup, existing),
    ).toBe(false);
    expect(
      isDateBlockedByExistingBooking("2026-05-26", DeliveryType.Pickup, existing),
    ).toBe(true);
  });

  it("uses optimistic Pickup timing for the candidate, unlike the stored window", () => {
    // The asymmetry, stated as a single assertion: the same date that is
    // *available* as a candidate would, if stored, have started blocking a day
    // earlier. Collapse the two figures and this test fails.
    expect(
      isDateBlockedByExistingBooking(FRI, DeliveryType.Pickup, existing),
    ).toBe(false);
    expect(calculateBookingWindow(FRI, DeliveryType.Pickup).blockedFrom).toBe(THU);
    expect(THU < existing.blockedUntil).toBe(true);
  });
});
