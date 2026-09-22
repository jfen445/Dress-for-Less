import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMocks } from "node-mocks-http";
import type { NextApiRequest, NextApiResponse } from "next";
import { db, resetDb, seedDress, seedUser } from "../fakes/db";
import { resetDaoSpies } from "../fakes/daos";

// Same seam as the other route tests. bookingWindow and
// checkBookingAvailability run for real — they are the subject.
vi.mock("../../lib/db/db", () => ({ dbConnect: vi.fn(async () => undefined) }));
vi.mock("../../lib/db/schema", async () => (await import("../fakes/daos")).schemaModule);
vi.mock("../../lib/db/booking-dao", async () => (await import("../fakes/daos")).bookingDao);
vi.mock("../../lib/db/coupon-dao", async () => (await import("../fakes/daos")).couponDao);
vi.mock("../../lib/db/user-dao", async () => (await import("../fakes/daos")).userDao);
vi.mock("../../lib/db/blockout-dao", async () => (await import("../fakes/daos")).blockoutDao);
vi.mock("../../sanity/sanity.query", async () => (await import("../fakes/daos")).sanityQuery);
vi.mock("../../lib/nzpost/client", async () => (await import("../fakes/daos")).nzpostClient);
vi.mock("stripe", async () => (await import("../fakes/stripe")).stripeModule);
vi.mock("../../pages/api/auth/[...nextauth]", () => ({ authOptions: {} }));
vi.mock("../../lib/booking/reconcileReservation", () => ({
  reconcileReservation: vi.fn(async () => "cancelled"),
}));

const getServerSession = vi.fn();
vi.mock("next-auth/next", () => ({ getServerSession }));

const handler = (await import("../../pages/api/booking")).default;

const NOW_ISO = "2026-05-31T21:00:00.000Z";

// Thursday. Delivery dispatch −3, Thursday turnaround +6, so one day here
// blocks 2026-09-28 → 2026-10-07. Ending Sunday 10-11 (+3) extends that to
// 2026-10-14.
const START = "2026-10-01";
// A Friday: its turnaround is +5, so the extended window runs to 2026-10-14.
// A weekend date would be refused outright — there is no counter to post at.
const END = "2026-10-09";
const WEEKEND_RETURN = "2026-10-11";
const DRESS_PRICE = 150;

let dressId: string;
let customerId: string;
let bookingId: string;

const seedExistingBooking = (over: Record<string, unknown> = {}) => {
  const booking = {
    _id: "507f1f77bcf86cd799439011",
    userId: customerId,
    items: [
      {
        _id: "item-1",
        dressId,
        size: "M",
        dateBooked: START,
        deliveryType: "Delivery",
        blockedFrom: "2026-09-28",
        blockedUntil: "2026-10-07",
        price: DRESS_PRICE,
      },
    ],
    totalPrice: DRESS_PRICE,
    paymentIntent: "ADMIN_MANUAL",
    paymentSuccess: true,
    reservedAt: null,
    discountAmount: 0,
    ...over,
  };
  db.bookings.push(booking as any);
  return booking;
};

// A different admin-created booking on the same dress. It shares the literal
// "ADMIN_MANUAL" payment intent with the booking being edited, which is the
// whole reason exclusion has to key on the booking id.
const seedRivalAdminBooking = (
  dateBooked: string,
  blockedFrom: string,
  blockedUntil: string,
) => {
  db.bookings.push({
    _id: "507f1f77bcf86cd799439099",
    userId: "another-customer",
    orderNumber: 1042,
    items: [
      {
        _id: "item-rival",
        dressId,
        size: "M",
        dateBooked,
        deliveryType: "Delivery",
        blockedFrom,
        blockedUntil,
        price: DRESS_PRICE,
      },
    ],
    totalPrice: DRESS_PRICE,
    paymentIntent: "ADMIN_MANUAL",
    paymentSuccess: true,
    reservedAt: null,
  } as any);
};

async function edit(
  items: Record<string, unknown>[],
  over: { bookingId?: string } = {},
) {
  const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
    method: "PATCH",
    query: { bookingId: over.bookingId ?? bookingId },
    body: {
      bookingObj: {
        items,
        userId: customerId,
        deliveryType: "Delivery",
        address: { address: "1 Queen St" },
        billingAddress: { address: "1 Queen St" },
        status: "N/A",
        instructions: "",
      },
    },
  });

  await handler(req, res);

  const raw = res._getData();
  let body: any;
  try {
    body = raw ? res._getJSONData() : undefined;
  } catch {
    body = raw;
  }
  return { status: res._getStatusCode(), body };
}

const line = (over: Record<string, unknown> = {}) => ({
  itemId: "item-1",
  dressId,
  size: "M",
  dateBooked: START,
  notes: "",
  ...over,
});

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(NOW_ISO));

  resetDb();
  resetDaoSpies();

  const admin = seedUser({ email: "admin@example.com", role: "admin" });
  customerId = seedUser({ email: "customer@example.com" })._id;
  dressId = seedDress({ price: String(DRESS_PRICE), m: 1 })._id;
  bookingId = seedExistingBooking()._id;

  getServerSession.mockResolvedValue({ user: { email: admin.email } });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("PATCH /api/booking — editing a booking's own dates", () => {
  it("does not let a booking collide with itself", async () => {
    // The booking under edit occupies 2026-09-28 → 2026-10-07 already. Saving
    // it unchanged has to succeed, which it only can if the availability check
    // excludes the row being edited.
    const { status } = await edit([line()]);

    expect(status).toBe(200);
  });

  it("extends a rental in place", async () => {
    const { status } = await edit([line({ returnDate: END })]);

    expect(status).toBe(200);

    const item = db.bookings.find((b) => b._id === bookingId)!.items[0];
    expect(item.returnDate).toBe(END);
    expect(item.blockedUntil).toBe("2026-10-14");
  });

  it("keeps counting OTHER admin bookings while excluding its own row", async () => {
    // Every admin booking carries the same "ADMIN_MANUAL" intent, so excluding
    // by payment intent would drop this rival too and the clash would go
    // unnoticed. 2026-10-12 blocks 2026-10-08 → 2026-10-16: clear of the
    // ordinary booking, hit by the extension falling due on 10-09.
    seedRivalAdminBooking("2026-10-12", "2026-10-08", "2026-10-16");

    // Unchanged still saves — the rival does not block the original dates.
    expect((await edit([line()])).status).toBe(200);

    const { status, body } = await edit([line({ returnDate: END })]);

    expect(status).toBe(409);
    expect(body.conflicts).toHaveLength(1);
    expect(body.conflicts[0]).toMatchObject({ orderNumber: 1042 });
  });

  it("refuses a return date before the rental date", async () => {
    const { status } = await edit([line({ returnDate: "2026-09-30" })]);

    expect(status).toBe(400);
  });

  it("refuses a weekend return on a posted booking", async () => {
    // The edit path carries its own copy of the gate, so it is proven here
    // rather than inferred from the create path passing.
    const { status } = await edit([line({ returnDate: WEEKEND_RETURN })]);

    expect(status).toBe(400);
  });

  it("refuses a rental longer than the maximum span", async () => {
    const { status } = await edit([line({ returnDate: "2027-10-01" })]);

    expect(status).toBe(400);
  });

  it("takes the price the admin entered", async () => {
    await edit([line({ returnDate: END, price: 340 })]);

    const booking = db.bookings.find((b) => b._id === bookingId)!;
    expect(booking.items[0].price).toBe(340);
    expect(booking.totalPrice).toBe(340);
  });

  it("refuses a caller who is not an admin", async () => {
    getServerSession.mockResolvedValue({ user: { email: "customer@example.com" } });

    expect((await edit([line()])).status).toBe(403);
  });
});
