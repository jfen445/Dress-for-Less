import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMocks } from "node-mocks-http";
import type { NextApiRequest, NextApiResponse } from "next";
import { db, resetDb, seedBooking, seedDress, seedUser } from "../fakes/db";
import { resetDaoSpies } from "../fakes/daos";

// Same seam as the other route tests: everything that leaves the process is
// faked, everything that decides runs for real. bookingWindow and
// checkBookingAvailability are the subjects here, so they are never mocked.
vi.mock("../../lib/db/db", () => ({ dbConnect: vi.fn(async () => undefined) }));
vi.mock("../../lib/db/schema", async () => (await import("../fakes/daos")).schemaModule);
vi.mock("../../lib/db/booking-dao", async () => (await import("../fakes/daos")).bookingDao);
vi.mock("../../lib/db/user-dao", async () => (await import("../fakes/daos")).userDao);
vi.mock("../../lib/db/blockout-dao", async () => (await import("../fakes/daos")).blockoutDao);
vi.mock("../../sanity/sanity.query", async () => (await import("../fakes/daos")).sanityQuery);
vi.mock("../../lib/utils/orderNumber", async () => (await import("../fakes/daos")).orderNumberModule);
vi.mock("../../pages/api/auth/[...nextauth]", () => ({ authOptions: {} }));

// The confirmation email is a side effect of a successful create, not part of
// what these tests are about; the route already swallows its failures.
const sendEmailConfirmation = vi.fn(async () => undefined);
vi.mock("../../pages/api/payment/paymentConfirm", () => ({ sendEmailConfirmation }));

const getServerSession = vi.fn();
vi.mock("next-auth/next", () => ({ getServerSession }));

const handler = (await import("../../pages/api/admin/bookings")).default;

const NOW_ISO = "2026-05-31T21:00:00.000Z";

// Thursday. Delivery dispatch is −3, and it falls due the next day (Friday),
// whose turnaround is +5 — so an ordinary booking here blocks 2026-09-28 →
// 2026-10-07 and is due back on DERIVED_RETURN.
const START = "2026-10-01";
const DERIVED_RETURN = "2026-10-02";
// A return date an admin picked: the Friday a week later, so its turnaround is
// also +5 and the window runs 2026-09-28 → 2026-10-14. Friday rather than a
// weekend because a posted return has to reach an NZ Post counter.
const END = "2026-10-09";
// Sunday. Only ever offered to a Delivery booking by mistake.
const WEEKEND_RETURN = "2026-10-11";
const EXTENDED_WINDOW = { blockedFrom: "2026-09-28", blockedUntil: "2026-10-14" };
const ONE_DAY_WINDOW = { blockedFrom: "2026-09-28", blockedUntil: "2026-10-07" };

const DRESS_PRICE = 150;

let dressId: string;
let customerId: string;

const line = (over: Record<string, unknown> = {}) => ({
  dressId,
  size: "M",
  dateBooked: START,
  notes: "",
  ...over,
});

async function createBooking(
  over: { items?: Record<string, unknown>[]; userId?: string; newUser?: unknown } = {},
  method = "POST",
) {
  const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
    method: method as any,
    body: {
      items: over.items ?? [line()],
      ...("newUser" in over ? { newUser: over.newUser } : { userId: over.userId ?? customerId }),
      deliveryType: "Delivery",
      address: { address: "1 Queen St" },
      billingAddress: { address: "1 Queen St" },
      instructions: "",
    },
  });

  await handler(req, res);

  // A 405 ends the response without a body, so parsing is conditional.
  const raw = res._getData();
  return {
    status: res._getStatusCode(),
    body: (raw ? res._getJSONData() : undefined) as any,
  };
}

// An existing paid booking for the same dress and size, so the candidate has
// something real to collide with.
const existingBookingOn = (dateBooked: string, window: { blockedFrom: string; blockedUntil: string }) =>
  seedBooking({
    userId: "another-customer",
    paymentIntent: "ADMIN_MANUAL",
    paymentSuccess: true,
    orderNumber: 1042,
    items: [
      {
        dressId,
        size: "M",
        dateBooked,
        deliveryType: "Delivery",
        blockedFrom: window.blockedFrom,
        blockedUntil: window.blockedUntil,
        price: DRESS_PRICE,
      },
    ],
  });

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(NOW_ISO));

  resetDb();
  resetDaoSpies();
  sendEmailConfirmation.mockClear();

  const admin = seedUser({ email: "admin@example.com", role: "admin" });
  customerId = seedUser({ email: "customer@example.com" })._id;
  dressId = seedDress({ price: String(DRESS_PRICE), m: 1 })._id;

  getServerSession.mockResolvedValue({ user: { email: admin.email } });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("POST /api/admin/bookings — extended bookings", () => {
  it("stores the chosen return date and a window running to it", async () => {
    const { status } = await createBooking({
      items: [line({ returnDate: END })],
    });
    expect(status).toBe(201);

    const item = db.bookings[0].items[0];
    expect(item.dateBooked).toBe(START);
    expect(item.returnDate).toBe(END);
    // Dispatch from the event weekday, turnaround from the return weekday.
    expect(item.blockedFrom).toBe(EXTENDED_WINDOW.blockedFrom);
    expect(item.blockedUntil).toBe(EXTENDED_WINDOW.blockedUntil);
  });

  it("derives the return date when the admin did not override it", async () => {
    const { status } = await createBooking();
    expect(status).toBe(201);

    const item = db.bookings[0].items[0];
    expect(item.returnDate).toBe(DERIVED_RETURN);
    expect(item.blockedUntil).toBe(ONE_DAY_WINDOW.blockedUntil);
  });

  it("refuses an extended booking laid over an existing one", async () => {
    // 2026-10-12 is a Monday, blocking 2026-10-08 → 2026-10-16. It is placed
    // in the gap only the extended range reaches: booking 10-01 alone is ready
    // again on 10-07 and clears it, while holding the dress until it falls due
    // on 10-09 pushes that to 10-14 and collides. So this fails both if the
    // range is ignored and if the old exact-date comparison comes back.
    existingBookingOn("2026-10-12", { blockedFrom: "2026-10-08", blockedUntil: "2026-10-16" });

    expect((await createBooking()).status).toBe(201);
    db.bookings.pop();

    const { status, body } = await createBooking({
      items: [line({ returnDate: END })],
    });

    expect(status).toBe(409);
    expect(body.conflicts).toHaveLength(1);
    expect(body.conflicts[0]).toMatchObject({
      orderNumber: 1042,
      dateBooked: "2026-10-12",
    });
  });

  it("refuses when a block-out falls inside the range, not just on its first day", async () => {
    db.blockouts.push({ dressId, size: "M", date: "2026-10-05" } as any);

    const { status } = await createBooking({
      items: [line({ returnDate: END })],
    });

    expect(status).toBe(409);
    expect(db.bookings).toHaveLength(0);
  });

  it("refuses two overlapping lines in the same request", async () => {
    // Neither line is in the database when the other is checked, so without
    // carrying the accepted lines forward both would pass.
    const { status } = await createBooking({
      items: [
        line({ returnDate: END }),
        line({ dateBooked: "2026-10-06", returnDate: "2026-10-08" }),
      ],
    });

    expect(status).toBe(409);
    expect(db.bookings).toHaveLength(0);
  });

  it("still allows a second unit when the size has stock to spare", async () => {
    // The replaced check refused any exact date match regardless of stock, so
    // a dress with two of a size could never be double-booked on one date.
    db.dresses.get(dressId)!.m = 2;
    existingBookingOn(START, ONE_DAY_WINDOW);

    expect((await createBooking()).status).toBe(201);
  });
});

describe("POST /api/admin/bookings — range validation", () => {
  it("refuses a return date before the event date", async () => {
    const { status } = await createBooking({
      items: [line({ returnDate: "2026-09-30" })],
    });

    expect(status).toBe(400);
    expect(db.bookings).toHaveLength(0);
  });

  it("refuses a return date earlier than the derived one", async () => {
    // The event date itself, which reads as a plausible "same-day return" and
    // is the value every pre-existing row carried in the field this replaced.
    // It is never valid: the dress is with the customer that day.
    const { status, body } = await createBooking({
      items: [line({ returnDate: START })],
    });

    expect(status).toBe(400);
    expect(body.message).toContain(DERIVED_RETURN);
    expect(db.bookings).toHaveLength(0);
  });

  it("refuses a weekend return on a posted booking", async () => {
    // There is no counter to lodge the parcel at, so the matrix rolls every
    // weekend return to the Monday. Only an override can reach one.
    const { status } = await createBooking({
      items: [line({ returnDate: WEEKEND_RETURN })],
    });

    expect(status).toBe(400);
    expect(db.bookings).toHaveLength(0);
  });

  it("refuses a rental longer than the maximum span", async () => {
    // A mistyped year is the case this exists for: it would otherwise withdraw
    // the dress from sale for twelve months with nothing to flag it. 2027-10-01
    // is a Friday, so it clears the weekday gate and reaches this one.
    const { status } = await createBooking({
      items: [line({ returnDate: "2027-10-01" })],
    });

    expect(status).toBe(400);
    expect(db.bookings).toHaveLength(0);
  });

  it("validates the range before creating a new customer", async () => {
    const { createUser } = await import("../fakes/daos").then((m) => m.userDao);

    const { status } = await createBooking({
      items: [line({ returnDate: "2027-10-01" })],
      newUser: { email: "new@example.com", firstName: "New", lastName: "Person" },
    });

    expect(status).toBe(400);
    // The customer row is written before the item loop runs, so a failure
    // there would otherwise leave an orphaned user behind.
    expect(createUser).not.toHaveBeenCalled();
  });
});

describe("POST /api/admin/bookings — pricing", () => {
  it("takes the price the admin entered", async () => {
    const { status } = await createBooking({
      items: [line({ returnDate: END, price: 340 })],
    });

    expect(status).toBe(201);
    expect(db.bookings[0].items[0].price).toBe(340);
    expect(db.bookings[0].totalPrice).toBe(340);
  });

  it("falls back to the Sanity price when none is entered", async () => {
    await createBooking();

    expect(db.bookings[0].items[0].price).toBe(DRESS_PRICE);
  });

  it("accepts a free booking but refuses a nonsensical price", async () => {
    expect((await createBooking({ items: [line({ price: 0 })] })).status).toBe(201);

    resetDb();
    seedUser({ email: "admin@example.com", role: "admin" });
    dressId = seedDress({ price: String(DRESS_PRICE), m: 1 })._id;
    customerId = seedUser({ email: "customer@example.com" })._id;

    expect((await createBooking({ items: [line({ price: -5 })] })).status).toBe(400);
    expect((await createBooking({ items: [line({ price: "abc" })] })).status).toBe(400);
  });
});

describe("POST /api/admin/bookings — access", () => {
  it("refuses a caller who is not an admin", async () => {
    getServerSession.mockResolvedValue({ user: { email: "customer@example.com" } });

    expect((await createBooking()).status).toBe(403);
    expect(db.bookings).toHaveLength(0);
  });

  it("answers an unsupported method instead of hanging", async () => {
    // The handler used to fall off the end of its if/else chain without ever
    // calling res, so the request hung until the platform timed it out.
    expect((await createBooking({}, "DELETE")).status).toBe(405);
  });
});
