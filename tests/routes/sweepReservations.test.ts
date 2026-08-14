import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMocks } from "node-mocks-http";
import type { NextApiRequest, NextApiResponse } from "next";
import { resetDb, seedBooking, seedTryOnBooking } from "../fakes/db";
import { resetDaoSpies } from "../fakes/daos";

vi.mock("../../lib/db/db", () => ({ dbConnect: vi.fn(async () => undefined) }));
vi.mock("../../lib/db/booking-dao", async () => (await import("../fakes/daos")).bookingDao);
vi.mock("../../lib/db/tryon-booking-dao", async () => (await import("../fakes/daos")).tryOnBookingDao);

const reconcileReservation = vi.fn(async (_intent: string) => "cancelled");
const reconcileTryOnReservation = vi.fn(async (_intent: string) => "cancelled");
vi.mock("../../lib/booking/reconcileReservation", () => ({ reconcileReservation }));
vi.mock("../../lib/tryOn/reconcileTryOnReservation", () => ({ reconcileTryOnReservation }));

const handler = (await import("../../pages/api/cron/sweep-reservations")).default;

const NOW_ISO = "2026-05-31T21:00:00.000Z";
const LAPSED_AT = "2026-05-31T20:40:00.000Z"; // 20 min ago — past the 15 min TTL
const FRESH_AT = "2026-05-31T20:55:00.000Z"; // 5 min ago — still within it

async function sweep(
  over: { method?: string; token?: string | null } = {},
) {
  const headers: Record<string, string> = {};
  if (over.token !== null) {
    headers.authorization = `Bearer ${over.token ?? "correct-secret"}`;
  }

  const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
    method: (over.method ?? "POST") as any,
    headers,
  });

  await handler(req, res);

  return { status: res._getStatusCode(), body: res._getJSONData() as any };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(NOW_ISO));

  resetDb();
  resetDaoSpies();
  reconcileReservation.mockClear();
  reconcileTryOnReservation.mockClear();
  reconcileReservation.mockImplementation(async () => "cancelled");
  reconcileTryOnReservation.mockImplementation(async () => "cancelled");

  process.env.CRON_SECRET = "correct-secret";
});

afterEach(() => {
  vi.useRealTimers();
});

describe("who may run the sweep", () => {
  it("refuses a request with no bearer token", async () => {
    expect((await sweep({ token: null })).status).toBe(401);
  });

  it("refuses a request with the wrong token", async () => {
    expect((await sweep({ token: "guess" })).status).toBe(401);
  });

  it("refuses anything but POST", async () => {
    expect((await sweep({ method: "GET" })).status).toBe(405);
  });

  it("does not reconcile anything it has refused", async () => {
    seedBooking({ paymentIntent: "pi_lapsed", reservedAt: LAPSED_AT });

    await sweep({ token: "guess" });

    expect(reconcileReservation).not.toHaveBeenCalled();
  });
});

describe("what it sweeps", () => {
  it("reconciles a lapsed rental hold", async () => {
    seedBooking({ paymentIntent: "pi_lapsed", reservedAt: LAPSED_AT });

    const { status, body } = await sweep();

    expect(status).toBe(200);
    expect(reconcileReservation).toHaveBeenCalledWith("pi_lapsed");
    expect(body.bookings).toEqual({
      examined: 1,
      cancelled: 1,
      promoted: 0,
      unresolved: 0,
    });
  });

  it("leaves a hold that has not yet lapsed alone", async () => {
    // Reconciling a payment still legitimately in progress would cancel it out
    // from under the customer mid-3DS.
    seedBooking({ paymentIntent: "pi_fresh", reservedAt: FRESH_AT });

    const { body } = await sweep();

    expect(reconcileReservation).not.toHaveBeenCalled();
    expect(body.bookings.examined).toBe(0);
  });

  it("leaves confirmed bookings alone", async () => {
    seedBooking({
      paymentIntent: "pi_paid",
      reservedAt: LAPSED_AT,
      paymentSuccess: true,
    });

    await sweep();

    expect(reconcileReservation).not.toHaveBeenCalled();
  });

  it("leaves rows predating the reservation scheme alone", async () => {
    seedBooking({ paymentIntent: "pi_legacy", reservedAt: null });

    await sweep();

    expect(reconcileReservation).not.toHaveBeenCalled();
  });

  it("sweeps rentals and try-ons in one pass", async () => {
    seedBooking({ paymentIntent: "pi_lapsed_rental", reservedAt: LAPSED_AT });
    seedTryOnBooking({ paymentIntent: "pi_lapsed_tryon", reservedAt: LAPSED_AT });

    const { body } = await sweep();

    expect(reconcileReservation).toHaveBeenCalledWith("pi_lapsed_rental");
    expect(reconcileTryOnReservation).toHaveBeenCalledWith("pi_lapsed_tryon");
    expect(body.bookings.examined).toBe(1);
    expect(body.tryOns.examined).toBe(1);
  });

  it("never sweeps an admin-created try-on", async () => {
    // Admin rows carry paymentSuccess: true, so they are never holds.
    seedTryOnBooking({
      paymentIntent: "ADMIN_MANUAL",
      paymentSuccess: true,
      reservedAt: null,
    });

    await sweep();

    expect(reconcileTryOnReservation).not.toHaveBeenCalled();
  });
});

describe("what it reports", () => {
  it("counts each outcome separately", async () => {
    seedBooking({ paymentIntent: "pi_a", reservedAt: LAPSED_AT });
    seedBooking({ paymentIntent: "pi_b", reservedAt: LAPSED_AT });
    seedBooking({ paymentIntent: "pi_c", reservedAt: LAPSED_AT });

    reconcileReservation
      .mockImplementationOnce(async () => "cancelled")
      .mockImplementationOnce(async () => "promoted")
      .mockImplementationOnce(async () => "unresolved");

    const { body } = await sweep();

    expect(body.bookings).toEqual({
      examined: 3,
      cancelled: 1,
      promoted: 1,
      unresolved: 1,
    });
  });

  it("keeps going after one hold cannot be resolved", async () => {
    // An unresolved hold is a normal outcome, not a reason to abandon the run.
    seedBooking({ paymentIntent: "pi_stuck", reservedAt: LAPSED_AT });
    seedBooking({ paymentIntent: "pi_next", reservedAt: LAPSED_AT });

    reconcileReservation.mockImplementationOnce(async () => "unresolved");

    const { status, body } = await sweep();

    expect(status).toBe(200);
    expect(reconcileReservation).toHaveBeenCalledWith("pi_next");
    expect(body.bookings.examined).toBe(2);
  });
});
