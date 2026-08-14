import { afterEach, describe, expect, it, vi } from "vitest";
import {
  RESERVATION_TTL_MINUTES,
  lapsedReservationCutoff,
  reservationExpiry,
} from "../../../../lib/utils/reservation";

const NOW = "2026-06-01T10:00:00.000Z";

afterEach(() => {
  vi.useRealTimers();
});

describe("reservation lifetime", () => {
  it("is 15 minutes — long enough to cover a slow 3DS challenge", () => {
    expect(RESERVATION_TTL_MINUTES).toBe(15);
  });

  it("puts the lapsed cutoff one TTL in the past", () => {
    expect(lapsedReservationCutoff(NOW)).toBe("2026-06-01T09:45:00.000Z");
  });

  it("puts a new reservation's expiry one TTL in the future", () => {
    expect(reservationExpiry(NOW)).toBe("2026-06-01T10:15:00.000Z");
  });

  it("keeps the coupon claim and the dress hold on one clock", () => {
    // A claim stamped with reservationExpiry becomes eligible for reconciling
    // at exactly the instant its booking row does — the two must not drift.
    expect(lapsedReservationCutoff(reservationExpiry(NOW))).toBe(NOW);
  });

  it("defaults to the current instant", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(NOW));

    expect(lapsedReservationCutoff()).toBe("2026-06-01T09:45:00.000Z");
    expect(reservationExpiry()).toBe("2026-06-01T10:15:00.000Z");
  });
});
