import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMocks } from "node-mocks-http";
import type { NextApiRequest, NextApiResponse } from "next";
import {
  db,
  resetDb,
  seedTryOnBooking,
  seedUser,
  tryOnBookingFor,
  type FakeTryOnBooking,
} from "../fakes/db";
import { paymentIntents, resetStripe } from "../fakes/stripe";
import {
  resetDaoSpies,
  tryOnAvailabilityDao,
  tryOnSlotIndexViolation,
} from "../fakes/daos";
import { TRY_ON_FEE } from "../../common/constants/tryOn";

vi.mock("../../lib/db/db", () => ({ dbConnect: vi.fn(async () => undefined) }));
vi.mock("../../lib/db/schema", async () => (await import("../fakes/daos")).schemaModule);
vi.mock("../../lib/db/tryon-booking-dao", async () => (await import("../fakes/daos")).tryOnBookingDao);
vi.mock("../../lib/db/tryon-availability-dao", async () => (await import("../fakes/daos")).tryOnAvailabilityDao);
vi.mock("../../lib/db/user-dao", async () => (await import("../fakes/daos")).userDao);
vi.mock("stripe", async () => (await import("../fakes/stripe")).stripeModule);
vi.mock("../../pages/api/auth/[...nextauth]", () => ({ authOptions: {} }));

const reconcileTryOnReservation = vi.fn(async (_intent: string) => "cancelled");
vi.mock("../../lib/tryOn/reconcileTryOnReservation", () => ({
  reconcileTryOnReservation,
}));

const getServerSession = vi.fn();
vi.mock("next-auth/next", () => ({ getServerSession }));

const handler = (await import("../../pages/api/tryOnBooking")).default;

const NOW_ISO = "2026-05-31T21:00:00.000Z"; // Mon 1 June 2026, 9am Auckland
const SLOT_DATE = "2026-07-10";
const TIME_SLOT = "18:30";
const PAYMENT_INTENT = "pi_tryon_under_test";
const CUSTOMER_EMAIL = "customer@example.com";

let userId: string;

async function reserve(
  over: {
    body?: Record<string, unknown>;
    method?: string;
  } = {},
) {
  const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
    method: (over.method ?? "POST") as any,
    body: {
      date: SLOT_DATE,
      timeSlot: TIME_SLOT,
      name: "Ada Lovelace",
      phone: "021 000 0000",
      paymentIntent: PAYMENT_INTENT,
      ...over.body,
    },
  });

  await handler(req, res);

  const raw = res._getData();
  let body: any;
  try {
    body = raw ? JSON.parse(raw) : undefined;
  } catch {
    body = raw;
  }

  return { status: res._getStatusCode(), body };
}

const rivalHold = (over: Partial<FakeTryOnBooking> = {}) =>
  seedTryOnBooking({
    paymentIntent: "pi_rival_tryon",
    userId: "rival-customer",
    date: SLOT_DATE,
    timeSlot: TIME_SLOT,
    paymentSuccess: false,
    reservedAt: "2026-05-31T20:00:00.000Z", // lapsed
    ...over,
  });

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(NOW_ISO));

  resetDb();
  resetDaoSpies();
  resetStripe(TRY_ON_FEE * 100);
  reconcileTryOnReservation.mockClear();
  reconcileTryOnReservation.mockImplementation(async () => "cancelled");

  userId = seedUser({ email: CUSTOMER_EMAIL })._id;

  getServerSession.mockResolvedValue({ user: { email: CUSTOMER_EMAIL } });
  paymentIntents.retrieve.mockImplementation(async (id: string) => ({
    id,
    amount: TRY_ON_FEE * 100,
    status: "requires_payment_method",
    metadata: { email: CUSTOMER_EMAIL },
    receipt_email: null,
  }));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("POST /api/tryOnBooking — the reserve", () => {
  it("writes the slot hold before the card is touched", async () => {
    const { status } = await reserve();

    expect(status).toBe(201);
    const row = tryOnBookingFor(PAYMENT_INTENT)!;
    expect(row.paymentSuccess).toBe(false);
    expect(row.reservedAt).toBe(NOW_ISO);
  });

  it("refuses an unauthenticated caller", async () => {
    getServerSession.mockResolvedValue(null);

    expect((await reserve()).status).toBe(401);
    expect(db.tryOnBookings).toHaveLength(0);
  });

  it("requires the booking details", async () => {
    const { status } = await reserve({ body: { timeSlot: undefined } });

    expect(status).toBe(400);
  });

  it("rejects anything but GET and POST", async () => {
    expect((await reserve({ method: "DELETE" })).status).toBe(405);
  });
});

describe("what it verifies about the payment intent", () => {
  it("refuses an intent for the wrong amount", async () => {
    // The payment hasn't happened yet — that's the point — so this checks the
    // intent is for what we expect, not that it succeeded.
    paymentIntents.retrieve.mockResolvedValue({
      id: PAYMENT_INTENT,
      amount: 100,
      metadata: { email: CUSTOMER_EMAIL },
    } as any);

    const { status, body } = await reserve();

    expect(status).toBe(400);
    expect(body.message).toMatch(/unexpected payment amount/i);
    expect(db.tryOnBookings).toHaveLength(0);
  });

  it("refuses an intent belonging to somebody else", async () => {
    // Without this, any signed-in customer could reserve a slot against another
    // customer's PaymentIntent.
    paymentIntents.retrieve.mockResolvedValue({
      id: PAYMENT_INTENT,
      amount: TRY_ON_FEE * 100,
      metadata: { email: "someone.else@example.com" },
    } as any);

    const { status } = await reserve();

    expect(status).toBe(403);
    expect(db.tryOnBookings).toHaveLength(0);
  });

  it("accepts the receipt email as proof of ownership", async () => {
    paymentIntents.retrieve.mockResolvedValue({
      id: PAYMENT_INTENT,
      amount: TRY_ON_FEE * 100,
      metadata: {},
      receipt_email: CUSTOMER_EMAIL,
    } as any);

    expect((await reserve()).status).toBe(201);
  });
});

describe("what it verifies about the slot", () => {
  it("refuses a date whose bookings have closed", async () => {
    // Try-on bookings close at noon the day before.
    const { status, body } = await reserve({
      body: { date: "2026-06-01" },
    });

    expect(status).toBe(400);
    expect(body.message).toMatch(/closed/i);
  });

  it("refuses a slot the admin has not opened", async () => {
    const { status, body } = await reserve({ body: { timeSlot: "23:00" } });

    expect(status).toBe(400);
    expect(body.message).toMatch(/not available/i);
  });

  it("refuses a date with no availability configured at all", async () => {
    tryOnAvailabilityDao.getAvailabilityForDate.mockResolvedValue(null as any);

    expect((await reserve()).status).toBe(400);
  });
});

describe("holds already on the slot", () => {
  it("reconciles the customer's own stale hold rather than blocking them", async () => {
    const own = rivalHold({ userId, paymentIntent: "pi_their_last_attempt" });
    reconcileTryOnReservation.mockImplementation(async (intent: string) => {
      db.tryOnBookings = db.tryOnBookings.filter(
        (b) => b.paymentIntent !== intent,
      );
      return "cancelled";
    });

    const { status } = await reserve();

    expect(reconcileTryOnReservation).toHaveBeenCalledWith(own.paymentIntent);
    expect(status).toBe(201);
  });

  it("reconciles a lapsed hold that blocks it, then looks again", async () => {
    rivalHold();
    reconcileTryOnReservation.mockImplementation(async (intent: string) => {
      db.tryOnBookings = db.tryOnBookings.filter(
        (b) => b.paymentIntent !== intent,
      );
      return "cancelled";
    });

    const { status } = await reserve();

    expect(reconcileTryOnReservation).toHaveBeenCalledWith("pi_rival_tryon");
    expect(status).toBe(201);
  });

  it("stays blocked when a lapsed hold can't be resolved", async () => {
    rivalHold();
    reconcileTryOnReservation.mockImplementation(async () => "unresolved");

    const { status, body } = await reserve();

    expect(status).toBe(409);
    expect(body.message).toMatch(/already been booked/i);
    expect(tryOnBookingFor("pi_rival_tryon")).toBeDefined();
  });

  it("leaves an unlapsed rival hold alone", async () => {
    // Inside its window that customer is still legitimately paying.
    rivalHold({ reservedAt: "2026-05-31T20:59:00.000Z" });

    expect((await reserve()).status).toBe(409);
    expect(reconcileTryOnReservation).not.toHaveBeenCalled();
  });

  it("refuses when the slot holds a confirmed booking", async () => {
    rivalHold({ paymentSuccess: true, reservedAt: null });

    expect((await reserve()).status).toBe(409);
  });
});

describe("retrying the same checkout", () => {
  it("updates its own hold in place rather than stacking a second", async () => {
    await reserve();
    await reserve({ body: { name: "Ada L" } });

    expect(db.tryOnBookings).toHaveLength(1);
    expect((tryOnBookingFor(PAYMENT_INTENT) as any).name).toBe("Ada L");
  });

  it("does not report the customer's own hold back to them as taken", async () => {
    await reserve();

    expect((await reserve()).status).toBe(201);
  });
});

describe("losing the race at the write", () => {
  it("turns the customer away with nothing charged", async () => {
    // Somebody else's reserve landed between the check and this write. The
    // unique index on { date, timeSlot } refuses the second one — which is only
    // safe because no card has been touched yet.
    tryOnSlotIndexViolation.active = true;

    const { status, body } = await reserve();

    expect(status).toBe(409);
    expect(body.message).toMatch(/already been booked/i);
    expect(db.tryOnBookings).toHaveLength(0);
  });
});
