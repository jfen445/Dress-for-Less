import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  bookingFor,
  resetDb,
  seedBooking,
  seedCoupon,
  seedDress,
  seedUser,
  type FakeBooking,
} from "../fakes/db";
import { paymentIntents, resetStripe } from "../fakes/stripe";
import {
  getNextOrderNumber,
  redeemCoupons,
  resetDaoSpies,
  sendEmail,
} from "../fakes/daos";

vi.mock("../../lib/db/db", () => ({ dbConnect: vi.fn(async () => undefined) }));
vi.mock("../../lib/db/schema", async () => (await import("../fakes/daos")).schemaModule);
vi.mock("../../lib/db/booking-dao", async () => (await import("../fakes/daos")).bookingDao);
vi.mock("../../lib/db/coupon-dao", async () => (await import("../fakes/daos")).couponDao);
vi.mock("../../lib/db/user-dao", async () => (await import("../fakes/daos")).userDao);
vi.mock("../../lib/db/cart-dao", async () => (await import("../fakes/daos")).cartDao);
vi.mock("../../lib/utils/orderNumber", async () => (await import("../fakes/daos")).orderNumberModule);
vi.mock("../../sanity/sanity.query", async () => (await import("../fakes/daos")).sanityQuery);
vi.mock("resend", async () => (await import("../fakes/daos")).resendModule);
vi.mock("stripe", async () => (await import("../fakes/stripe")).stripeModule);
vi.mock("next-auth/next", () => ({ getServerSession: vi.fn() }));
vi.mock("../../pages/api/auth/[...nextauth]", () => ({ authOptions: {} }));
// The receipt is a .tsx React email; the node project has no JSX transform and
// the template isn't what's under test here.
vi.mock("@/components/Emails/OrderReceipt", () => ({ default: () => null }));

const { confirmReservation } = await import(
  "../../pages/api/payment/paymentConfirm"
);

const PAYMENT_INTENT = "pi_awaiting_confirmation";
const CUSTOMER_EMAIL = "customer@example.com";

// A confirmation sends two emails: the customer's receipt and an internal
// notification. Counting only the customer's is what makes "not emailed twice"
// mean what it says.
const receiptsSentTo = (address: string) =>
  sendEmail.mock.calls.filter(([payload]) =>
    ((payload as any)?.to ?? []).includes(address),
  );

let userId: string;
let dressId: string;

const reservation = (over: Partial<FakeBooking> = {}) =>
  seedBooking({
    userId,
    paymentIntent: PAYMENT_INTENT,
    paymentSuccess: false,
    reservedAt: "2026-05-31T21:00:00.000Z",
    totalPrice: 165,
    items: [
      {
        dressId,
        size: "M",
        dateBooked: "2026-07-10",
        deliveryType: "Delivery",
        blockedFrom: "2026-07-08",
        blockedUntil: "2026-07-15",
        price: 150,
      },
    ],
    billingAddress: { address: "1 Queen St" },
    ...over,
  });

beforeEach(() => {
  resetDb();
  resetDaoSpies();
  resetStripe();

  userId = seedUser({ email: "customer@example.com", name: "Ada" })._id;
  dressId = seedDress()._id;
});

describe("confirmReservation", () => {
  it("turns the hold into a real booking", async () => {
    reservation();

    const { alreadyConfirmed } = await confirmReservation(PAYMENT_INTENT);

    expect(alreadyConfirmed).toBe(false);
    expect(bookingFor(PAYMENT_INTENT)!.paymentSuccess).toBe(true);
  });

  it("allocates the order number here, not at reserve time", async () => {
    // An abandoned checkout must not burn one.
    reservation();

    await confirmReservation(PAYMENT_INTENT);

    expect(getNextOrderNumber).toHaveBeenCalledTimes(1);
    expect(bookingFor(PAYMENT_INTENT)!.orderNumber).toBe(1001);
  });

  it("turns the held coupon slot into a permanent redemption", async () => {
    const coupon = seedCoupon({
      userId,
      pendingClaims: [
        { userId, paymentIntent: PAYMENT_INTENT, expiresAt: "2999-01-01T00:00:00.000Z" },
      ],
    });
    reservation({ couponIds: [coupon._id] });

    await confirmReservation(PAYMENT_INTENT);

    expect(coupon.isRedeemed).toBe(true);
    // The claim goes in the same write, so the slot is never counted twice —
    // once as held and once as spent.
    expect(coupon.pendingClaims).toEqual([]);
  });

  it("sends the customer their receipt", async () => {
    reservation();

    await confirmReservation(PAYMENT_INTENT);

    expect(receiptsSentTo(CUSTOMER_EMAIL)).toHaveLength(1);
  });

  it("notifies the shop as well as the customer", async () => {
    reservation();

    await confirmReservation(PAYMENT_INTENT);

    expect(receiptsSentTo("dressforlessnz@gmail.com")).toHaveLength(1);
  });
});

describe("whichever arrives first wins", () => {
  // /order-success and the Stripe webhook both call this, routinely at the same
  // moment. The guard is the paymentSuccess condition on the updateMany.
  it("reports alreadyConfirmed on the second call", async () => {
    reservation();

    const first = await confirmReservation(PAYMENT_INTENT);
    const second = await confirmReservation(PAYMENT_INTENT);

    expect(first.alreadyConfirmed).toBe(false);
    expect(second.alreadyConfirmed).toBe(true);
  });

  it("does not allocate a second order number", async () => {
    reservation();

    await confirmReservation(PAYMENT_INTENT);
    await confirmReservation(PAYMENT_INTENT);

    expect(getNextOrderNumber).toHaveBeenCalledTimes(1);
    expect(bookingFor(PAYMENT_INTENT)!.orderNumber).toBe(1001);
  });

  it("does not email the customer twice", async () => {
    reservation();

    await confirmReservation(PAYMENT_INTENT);
    await confirmReservation(PAYMENT_INTENT);

    expect(receiptsSentTo(CUSTOMER_EMAIL)).toHaveLength(1);
  });

  it("does not redeem the coupon twice", async () => {
    const coupon = seedCoupon({ userId, isGlobal: true, maxRedemptions: 5 });
    reservation({ couponIds: [coupon._id] });

    await confirmReservation(PAYMENT_INTENT);
    await confirmReservation(PAYMENT_INTENT);

    expect(redeemCoupons).toHaveBeenCalledTimes(1);
    expect(coupon.redeemedByUserIds).toEqual([userId]);
  });

  it("still returns the booking to the losing caller", async () => {
    reservation();

    await confirmReservation(PAYMENT_INTENT);
    const second = await confirmReservation(PAYMENT_INTENT);

    expect(second.booking?.paymentIntent).toBe(PAYMENT_INTENT);
    expect(bookingFor(PAYMENT_INTENT)!.paymentSuccess).toBe(true);
  });
});

describe("order numbers", () => {
  it("keeps a number the row already carried", async () => {
    // A legacy or admin-created row arriving here is not re-numbered.
    reservation({ orderNumber: 42 });

    await confirmReservation(PAYMENT_INTENT);

    expect(getNextOrderNumber).not.toHaveBeenCalled();
    expect(bookingFor(PAYMENT_INTENT)!.orderNumber).toBe(42);
  });
});

describe("free-coupon checkouts", () => {
  const FREE_INTENT = "FREE_COUPON_fully-covered";

  it("confirms without touching Stripe", async () => {
    reservation({ paymentIntent: FREE_INTENT, totalPrice: 0 });

    const { alreadyConfirmed } = await confirmReservation(FREE_INTENT);

    expect(alreadyConfirmed).toBe(false);
    expect(bookingFor(FREE_INTENT)!.paymentSuccess).toBe(true);
    expect(paymentIntents.update).not.toHaveBeenCalled();
  });

  it("still allocates an order number and sends a receipt", async () => {
    reservation({ paymentIntent: FREE_INTENT, totalPrice: 0 });

    await confirmReservation(FREE_INTENT);

    expect(bookingFor(FREE_INTENT)!.orderNumber).toBe(1001);
    expect(receiptsSentTo(CUSTOMER_EMAIL)).toHaveLength(1);
  });
});

describe("nothing to confirm", () => {
  it("reports alreadyConfirmed rather than inventing a booking", async () => {
    const { booking, alreadyConfirmed } = await confirmReservation("pi_unknown");

    expect(alreadyConfirmed).toBe(true);
    expect(booking).toBeUndefined();
    expect(getNextOrderNumber).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
  });
});
