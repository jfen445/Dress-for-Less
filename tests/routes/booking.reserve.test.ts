import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMocks } from "node-mocks-http";
import type { NextApiRequest, NextApiResponse } from "next";
import {
  bookingFor,
  db,
  resetDb,
  seedBooking,
  seedCoupon,
  seedDress,
  seedUser,
  type FakeBooking,
} from "../fakes/db";
import { paymentIntents, resetStripe } from "../fakes/stripe";
import { claimCoupon, releaseCouponClaims, resetDaoSpies, resolveRuralDeliveryStatus } from "../fakes/daos";

// Everything that leaves the process is faked; everything that decides is real.
// couponRules, deliveryRules, bookingWindow, reservation and
// checkBookingAvailability (including outranksReservation) all run for real —
// they are what these tests are about.
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

// Reconcile is stubbed here so a test can say what Stripe concluded about a
// blocking hold; its own behaviour is covered in reconcileReservation.test.ts.
const reconcileReservation = vi.fn(async (_paymentIntent: string) => "cancelled");
vi.mock("../../lib/booking/reconcileReservation", () => ({ reconcileReservation }));

const getServerSession = vi.fn();
vi.mock("next-auth/next", () => ({ getServerSession }));

const handler = (await import("../../pages/api/booking")).default;

// 9am Auckland on Mon 1 June 2026 (UTC+12), comfortably inside the cutoff for
// the event date below.
const NOW_ISO = "2026-05-31T21:00:00.000Z";
const NOW_NZ = "2026-06-01T09:00:00+12:00";
// Friday. Delivery blocks 2026-07-08 → 2026-07-15; cutoff is 2026-07-07 20:00.
const EVENT_DATE = "2026-07-10";
const DRESS_PRICE = 150;
const SHIPPING = 15;
const TOTAL_CENTS = (DRESS_PRICE + SHIPPING) * 100;

const PAYMENT_INTENT = "pi_reserve_under_test";

let dressId: string;
let userId: string;

const item = (over: Record<string, unknown> = {}) => ({
  dressId,
  size: "M",
  dateBooked: EVENT_DATE,
  deliveryType: "Delivery",
  // Deliberately a lie: the server must price from Sanity, never from this.
  price: "1",
  address: { address: "1 Queen St", nzPostDpid: "dpid-1" },
  instructions: "",
  ...over,
});

async function reserve(
  over: {
    items?: Record<string, unknown>[];
    paymentIntent?: string;
    couponIds?: string[];
  } = {},
) {
  const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
    method: "POST",
    body: {
      paymentIntent: over.paymentIntent ?? PAYMENT_INTENT,
      couponIds: over.couponIds ?? [],
      booking: {
        userId: "client-supplied-and-ignored",
        items: over.items ?? [item()],
        billingAddress: {
          address: "1 Queen St",
          suburb: "CBD",
          city: "Auckland",
          country: "NZ",
          postCode: "1010",
        },
        tracking: "",
        isShipped: false,
        isReturned: false,
        status: "In Progress",
      },
    },
  });

  await handler(req, res);

  return { status: res._getStatusCode(), body: res._getJSONData() as any };
}

// A rival reservation for the same dress/size/date, ranked relative to ours by
// reservedAt. Used to drive the post-write re-check.
const rival = (reservedAt: string): Partial<FakeBooking> => ({
  userId: "rival-customer",
  paymentIntent: "pi_rival",
  paymentSuccess: false,
  reservedAt,
  items: [
    {
      dressId,
      size: "M",
      dateBooked: EVENT_DATE,
      deliveryType: "Delivery",
      blockedFrom: "2026-07-08",
      blockedUntil: "2026-07-15",
      price: DRESS_PRICE,
    },
  ],
});

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(NOW_ISO));

  resetDb();
  resetDaoSpies();
  resetStripe(TOTAL_CENTS);
  reconcileReservation.mockClear();
  reconcileReservation.mockImplementation(async () => "cancelled");

  const user = seedUser({ email: "customer@example.com" });
  userId = user._id;
  dressId = seedDress({ price: String(DRESS_PRICE), m: 1 })._id;

  getServerSession.mockResolvedValue({ user: { email: user.email } });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("POST /api/booking — the reserve", () => {
  it("writes the row as an unpaid hold before anything is charged", async () => {
    const { status } = await reserve();
    expect(status).toBe(200);

    const row = bookingFor(PAYMENT_INTENT)!;
    expect(row).toBeDefined();
    // paymentSuccess false + reservedAt set is what makes this row a hold: it
    // blocks the date while the customer pays, and lapses on its own.
    expect(row.paymentSuccess).toBe(false);
    expect(row.reservedAt).toBe(NOW_ISO);
    expect(row.orderNumber).toBeUndefined();
  });

  it("takes the booking's owner from the session, not the payload", async () => {
    await reserve();

    expect(bookingFor(PAYMENT_INTENT)!.userId).toBe(userId);
  });

  it("prices from Sanity and ignores the price in the payload", async () => {
    await reserve();

    const row = bookingFor(PAYMENT_INTENT)!;
    expect(row.items[0].price).toBe(DRESS_PRICE);
    expect(row.totalPrice).toBe(DRESS_PRICE + SHIPPING);
  });

  it("refuses an unauthenticated caller", async () => {
    getServerSession.mockResolvedValue(null);

    expect((await reserve()).status).toBe(401);
    expect(db.bookings).toHaveLength(0);
  });

  it("requires a payment intent", async () => {
    expect((await reserve({ paymentIntent: "" })).status).toBe(400);
  });
});

describe("the notice-from-today gate", () => {
  // 2026-06-02 is a Tuesday: Delivery dispatch is 5 days earlier (2026-05-28),
  // so the cutoff was 8pm on 2026-05-27 — already past at the frozen instant.
  const tooLate = () => item({ dateBooked: "2026-06-02" });

  it("rejects a date past its cutoff with its own 409", async () => {
    const { status, body } = await reserve({ items: [tooLate()] });

    expect(status).toBe(409);
    expect(body.message).toMatch(/too late to book/i);
    expect(body.body).toEqual([dressId]);
  });

  it("rejects before taking a coupon slot or writing anything", async () => {
    // The gate sits ahead of every side effect precisely so its failure needs
    // no unwinding.
    const coupon = seedCoupon({ userId, discountAmount: 20 });

    await reserve({ items: [tooLate()], couponIds: [coupon._id] });

    expect(claimCoupon).not.toHaveBeenCalled();
    expect(db.bookings).toHaveLength(0);
  });

  it("applies to Pickup items too, not just Delivery", async () => {
    // Pickup dispatches the day before, so its cutoff is later than Delivery's
    // — but it is still a cutoff, which is what once made Pickup bookable past
    // the point of no return.
    const { status } = await reserve({
      items: [item({ dateBooked: "2026-06-02", deliveryType: "Pickup" })],
    });

    expect(status).toBe(409);
  });

  it("judges every item against one instant", async () => {
    const { body } = await reserve({
      items: [item(), tooLate()],
    });

    expect(body.body).toEqual([dressId]);
    expect(db.bookings).toHaveLength(0);
  });
});

describe("coupon slots", () => {
  it("stops the checkout when a slot can't be claimed, with nothing written", async () => {
    // A one-use code already spent by someone else. The customer must be
    // stopped here, with their card untouched — this is the original bug.
    const coupon = seedCoupon({ userId, isRedeemed: true });

    const { status, body } = await reserve({ couponIds: [coupon._id] });

    expect(status).toBe(409);
    expect(body.message).toMatch(/no longer available/i);
    expect(body.message).toMatch(/not been charged/i);
    expect(db.bookings).toHaveLength(0);
  });

  it("hands back a partial claim when a later coupon in the same order fails", async () => {
    const good = seedCoupon({ userId, discountAmount: 10 });
    const spent = seedCoupon({ userId, isRedeemed: true });

    await reserve({ couponIds: [good._id, spent._id] });

    expect(releaseCouponClaims).toHaveBeenCalledWith(PAYMENT_INTENT);
    expect(good.pendingClaims ?? []).toHaveLength(0);
  });

  it("holds the claim for the length of the reservation", async () => {
    const coupon = seedCoupon({ userId, discountAmount: 10 });

    await reserve({ couponIds: [coupon._id] });

    // Claim and hold lapse together — reservationExpiry is one TTL from now.
    expect(coupon.pendingClaims).toEqual([
      {
        userId,
        paymentIntent: PAYMENT_INTENT,
        expiresAt: "2026-05-31T21:15:00.000Z",
      },
    ]);
  });

  it("records the discount against the reservation", async () => {
    const coupon = seedCoupon({ userId, discountAmount: 40, discountType: "flat" });

    await reserve({ couponIds: [coupon._id] });

    const row = bookingFor(PAYMENT_INTENT)!;
    expect(row.discountAmount).toBe(40);
    expect(row.totalPrice).toBe(DRESS_PRICE + SHIPPING - 40);
  });

  it("never persists a negative total, however large the coupon", async () => {
    // A cart-scoped flat coupon is not capped at the cart it is spent on, so
    // the total has to be floored where it is written — otherwise the row
    // carries a negative figure into every admin total that sums the column.
    const coupon = seedCoupon({
      userId,
      discountAmount: 500,
      discountType: "flat",
    });

    const freeIntent = "FREE_COUPON_over-generous";
    const { status } = await reserve({
      paymentIntent: freeIntent,
      couponIds: [coupon._id],
    });

    expect(status).toBe(200);
    expect(bookingFor(freeIntent)!.totalPrice).toBe(0);
  });

  it("refuses a free checkout whose coupons don't cover the total", async () => {
    const coupon = seedCoupon({ userId, discountAmount: 10 });

    const { status, body } = await reserve({
      paymentIntent: "FREE_COUPON_not-enough",
      couponIds: [coupon._id],
    });

    expect(status).toBe(400);
    expect(body.message).toMatch(/do not cover/i);
    expect(db.bookings).toHaveLength(0);
  });
});

describe("availability", () => {
  it("refuses when the date is already taken and nothing frees it", async () => {
    seedBooking({ ...rival("2026-05-31T20:00:00.000Z"), paymentSuccess: true });

    const { status, body } = await reserve();

    expect(status).toBe(409);
    expect(body.body).toEqual([dressId]);
    expect(db.bookings).toHaveLength(1);
  });

  it("never reaches the coupon step when the date is already gone", async () => {
    seedBooking({ ...rival("2026-05-31T20:00:00.000Z"), paymentSuccess: true });
    const coupon = seedCoupon({ userId, discountAmount: 10 });

    await reserve({ couponIds: [coupon._id] });

    expect(claimCoupon).not.toHaveBeenCalled();
  });

  it("refuses a date that is blocked out", async () => {
    db.blockouts.push({ dressId, size: "M", date: EVENT_DATE });

    expect((await reserve()).status).toBe(409);
  });

  it("reconciles the customer's own stale hold rather than blocking them", async () => {
    // Their card was declined, they are trying again, and their own ghost hold
    // is the only thing in the way.
    const own = seedBooking({
      ...rival("2026-05-31T20:00:00.000Z"),
      userId,
      paymentIntent: "pi_their_previous_attempt",
    });
    reconcileReservation.mockImplementation(async (intent: string) => {
      db.bookings = db.bookings.filter((b) => b.paymentIntent !== intent);
      return "cancelled";
    });

    const { status } = await reserve();

    expect(reconcileReservation).toHaveBeenCalledWith(own.paymentIntent);
    expect(status).toBe(200);
  });

  it("reconciles a lapsed hold that blocks it, then looks again", async () => {
    // A slot only needs freeing at the moment somebody wants it, which is
    // exactly when the reserve looks — so a stalled sweep delays cleanup
    // rather than taking dates out of sale.
    seedBooking(rival("2026-05-31T20:00:00.000Z")); // lapsed: >15 min old
    reconcileReservation.mockImplementation(async (intent: string) => {
      db.bookings = db.bookings.filter((b) => b.paymentIntent !== intent);
      return "cancelled";
    });

    const { status } = await reserve();

    expect(reconcileReservation).toHaveBeenCalledWith("pi_rival");
    expect(status).toBe(200);
  });

  it("stays blocked when a lapsed hold can't be resolved", async () => {
    // Blocking a date we could have sold is recoverable; selling one twice is
    // not. An unresolved reconcile must leave the row holding.
    seedBooking(rival("2026-05-31T20:00:00.000Z"));
    reconcileReservation.mockImplementation(async () => "unresolved");

    expect((await reserve()).status).toBe(409);
    expect(bookingFor("pi_rival")).toBeDefined();
  });

  it("leaves an unlapsed rival hold alone", async () => {
    // Inside its window the rival is still legitimately paying. Reconciling it
    // here would cancel a live payment out from under that customer.
    seedBooking(rival("2026-05-31T20:59:00.000Z"));

    expect((await reserve()).status).toBe(409);
    expect(reconcileReservation).not.toHaveBeenCalled();
  });
});

describe("the post-write re-check", () => {
  // The pre-write check and the write are not one atomic operation, so a rival
  // can land in between. These tests drop one in during the rural lookup, which
  // runs after availability has passed and before the row is written.
  const rivalLandsMidReserve = (reservedAt: string) => {
    resolveRuralDeliveryStatus.mockImplementationOnce(async () => {
      seedBooking(rival(reservedAt));
      return { isRural: false, verified: true };
    });
  };

  it("undoes its own reservation when it loses the race", async () => {
    rivalLandsMidReserve("2026-05-31T20:59:59.000Z"); // earlier: outranks us

    const { status, body } = await reserve();

    expect(status).toBe(409);
    expect(body.body).toEqual([dressId]);
    // Undoing is free precisely because nothing has been charged yet.
    expect(bookingFor(PAYMENT_INTENT)).toBeUndefined();
  });

  it("hands the coupon slot back when it undoes itself", async () => {
    const coupon = seedCoupon({ userId, discountAmount: 10 });
    rivalLandsMidReserve("2026-05-31T20:59:59.000Z");

    await reserve({ couponIds: [coupon._id] });

    expect(coupon.pendingClaims ?? []).toHaveLength(0);
  });

  it("stands its ground against a rival that does not outrank it", async () => {
    // Exactly one side of the race backs out. If both did, neither customer
    // gets the dress and the ordering would be pointless.
    rivalLandsMidReserve("2026-05-31T21:00:01.000Z"); // later: we outrank it

    const { status } = await reserve();

    expect(status).toBe(200);
    expect(bookingFor(PAYMENT_INTENT)).toBeDefined();
  });

  it("leaves the payment intent alive so the customer can retry", async () => {
    rivalLandsMidReserve("2026-05-31T20:59:59.000Z");

    await reserve();

    expect(paymentIntents.cancel).not.toHaveBeenCalled();
  });
});

describe("the Stripe amount", () => {
  it("refuses to charge more than the customer was quoted", async () => {
    resetStripe(TOTAL_CENTS - 5_000);

    const { status, body } = await reserve();

    expect(status).toBe(409);
    expect(body.message).toMatch(/total for this order has changed/i);
    expect(db.bookings).toHaveLength(0);
    expect(paymentIntents.update).not.toHaveBeenCalled();
  });

  it("lowers the amount to the server's figure without asking", async () => {
    resetStripe(TOTAL_CENTS + 5_000);

    const { status } = await reserve();

    expect(status).toBe(200);
    expect(paymentIntents.update).toHaveBeenCalledWith(PAYMENT_INTENT, {
      amount: TOTAL_CENTS,
    });
  });

  it("never touches Stripe for a free-coupon checkout", async () => {
    const coupon = seedCoupon({ userId, discountAmount: 500 });

    await reserve({
      paymentIntent: "FREE_COUPON_no-stripe",
      couponIds: [coupon._id],
    });

    expect(paymentIntents.retrieve).not.toHaveBeenCalled();
    expect(paymentIntents.update).not.toHaveBeenCalled();
  });
});

describe("rural delivery", () => {
  it("prices from NZ Post's answer, not the client's flag", async () => {
    resolveRuralDeliveryStatus.mockResolvedValue({
      isRural: true,
      verified: true,
    });
    resetStripe((DRESS_PRICE + SHIPPING + 5) * 100);

    const { status } = await reserve({
      items: [item({ address: { address: "1 Rural Rd", nzPostDpid: "dpid-1", isRuralDelivery: false } })],
    });

    expect(status).toBe(200);
    expect(bookingFor(PAYMENT_INTENT)!.totalPrice).toBe(DRESS_PRICE + SHIPPING + 5);
  });

  it("charges no shipping at all for a Pickup order", async () => {
    resetStripe(DRESS_PRICE * 100);

    const { status } = await reserve({
      items: [item({ deliveryType: "Pickup", address: null })],
    });

    expect(status).toBe(200);
    expect(bookingFor(PAYMENT_INTENT)!.totalPrice).toBe(DRESS_PRICE);
  });
});
