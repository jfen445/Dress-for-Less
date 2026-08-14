import { describe, expect, it, vi } from "vitest";

// checkBookingAvailability imports the Sanity client and the booking DAO at
// module scope. The Sanity client throws on construction without a projectId,
// and the DAO would pull in mongoose — neither is needed to test the ordering,
// so both are stubbed away at the same seam layer 3 uses.
vi.mock("../../../../sanity/sanity.query", () => ({ getDress: vi.fn() }));
vi.mock("../../../../lib/db/booking-dao", () => ({
  getBookingAvailabilityByDress: vi.fn(),
}));

const { outranksReservation } = await import(
  "../../../../lib/utils/checkBookingAvailability"
);

const candidate = { reservedAt: "2026-06-01T10:00:00.000Z", paymentIntent: "pi_200" };

describe("outranksReservation", () => {
  it("lets a confirmed booking outrank any reservation", () => {
    expect(
      outranksReservation(
        {
          size: "M",
          blockedFrom: "2026-06-01",
          blockedUntil: "2026-06-05",
          paymentSuccess: true,
          reservedAt: "2026-06-01T23:00:00.000Z",
          paymentIntent: "pi_999",
        },
        candidate,
      ),
    ).toBe(true);
  });

  it("lets a row predating the reservation scheme outrank", () => {
    // No reservedAt means it was written before holds existed; it can't be
    // ordered, so it wins by default rather than being trampled.
    expect(
      outranksReservation(
        { size: "M", blockedFrom: "2026-06-01", blockedUntil: "2026-06-05" },
        candidate,
      ),
    ).toBe(true);
  });

  it("gives precedence to the earlier reservation", () => {
    const earlier = {
      size: "M",
      blockedFrom: "2026-06-01",
      blockedUntil: "2026-06-05",
      reservedAt: "2026-06-01T09:59:59.999Z",
      paymentIntent: "pi_999",
    };

    expect(outranksReservation(earlier, candidate)).toBe(true);
  });

  it("does not give precedence to the later reservation", () => {
    const later = {
      size: "M",
      blockedFrom: "2026-06-01",
      blockedUntil: "2026-06-05",
      reservedAt: "2026-06-01T10:00:00.001Z",
      paymentIntent: "pi_000",
    };

    expect(outranksReservation(later, candidate)).toBe(false);
  });

  it("breaks an exact tie on payment intent", () => {
    const tie = (paymentIntent: string) => ({
      size: "M",
      blockedFrom: "2026-06-01",
      blockedUntil: "2026-06-05",
      reservedAt: candidate.reservedAt,
      paymentIntent,
    });

    expect(outranksReservation(tie("pi_100"), candidate)).toBe(true);
    expect(outranksReservation(tie("pi_300"), candidate)).toBe(false);
  });

  it("does not outrank itself", () => {
    // The reserve re-checks against rows including its own; it must not read
    // its own write as a competitor and back out.
    expect(
      outranksReservation(
        {
          size: "M",
          blockedFrom: "2026-06-01",
          blockedUntil: "2026-06-05",
          reservedAt: candidate.reservedAt,
          paymentIntent: candidate.paymentIntent,
        },
        candidate,
      ),
    ).toBe(false);
  });

  it("is a total order: for any two distinct reservations, exactly one wins", () => {
    // The property the whole design rests on. If both sides could conclude the
    // other outranks them, both back out and neither customer gets the dress;
    // if neither could, both proceed and the dress is sold twice.
    const reservations = [
      { reservedAt: "2026-06-01T10:00:00.000Z", paymentIntent: "pi_100" },
      { reservedAt: "2026-06-01T10:00:00.000Z", paymentIntent: "pi_200" },
      { reservedAt: "2026-06-01T10:00:00.001Z", paymentIntent: "pi_050" },
      { reservedAt: "2026-06-01T09:59:59.999Z", paymentIntent: "pi_900" },
    ];

    for (const a of reservations) {
      for (const b of reservations) {
        if (a.reservedAt === b.reservedAt && a.paymentIntent === b.paymentIntent) {
          continue;
        }

        const row = (r: typeof a) => ({
          size: "M",
          blockedFrom: "2026-06-01",
          blockedUntil: "2026-06-05",
          reservedAt: r.reservedAt,
          paymentIntent: r.paymentIntent,
        });

        expect(
          [outranksReservation(row(a), b), outranksReservation(row(b), a)].filter(
            Boolean,
          ),
        ).toHaveLength(1);
      }
    }
  });
});
