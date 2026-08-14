import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  bookingFor,
  db,
  resetDb,
  seedBooking,
  type FakeBooking,
} from "../fakes/db";
import {
  paymentIntents,
  resetStripe,
  stripeRefusesCancelBecauseSucceeded,
} from "../fakes/stripe";
import { releaseCouponClaims, resetDaoSpies } from "../fakes/daos";

vi.mock("../../lib/db/schema", async () => (await import("../fakes/daos")).schemaModule);
vi.mock("../../lib/db/coupon-dao", async () => (await import("../fakes/daos")).couponDao);
vi.mock("stripe", async () => (await import("../fakes/stripe")).stripeModule);

const confirmReservation = vi.fn(async () => ({ status: "confirmed" }));
vi.mock("../../pages/api/payment/paymentConfirm", () => ({ confirmReservation }));

const { reconcileReservation } = await import(
  "../../lib/booking/reconcileReservation"
);

const PAYMENT_INTENT = "pi_lapsed_hold";

const hold = (over: Partial<FakeBooking> = {}) =>
  seedBooking({
    paymentIntent: PAYMENT_INTENT,
    paymentSuccess: false,
    reservedAt: "2026-05-31T20:00:00.000Z",
    ...over,
  });

beforeEach(() => {
  resetDb();
  resetDaoSpies();
  resetStripe();
  confirmReservation.mockClear();
  confirmReservation.mockResolvedValue({ status: "confirmed" } as any);
});

describe("cancelled — the payment can never happen", () => {
  it("cancels the intent before deleting the row, never the other way round", async () => {
    hold();

    const outcome = await reconcileReservation(PAYMENT_INTENT);

    expect(outcome).toBe("cancelled");
    expect(paymentIntents.cancel).toHaveBeenCalledWith(PAYMENT_INTENT);
    expect(bookingFor(PAYMENT_INTENT)).toBeUndefined();
  });

  it("hands back the coupon slots with the row", async () => {
    // A reservation and its claims are one unit — freeing the dress but not
    // the code would strand a one-use coupon for an order that no longer
    // exists.
    hold();

    await reconcileReservation(PAYMENT_INTENT);

    expect(releaseCouponClaims).toHaveBeenCalledWith(PAYMENT_INTENT);
  });

  it("skips Stripe entirely for a free-coupon checkout", async () => {
    // There is no payment behind one, so nothing could later charge.
    const freeIntent = "FREE_COUPON_abandoned";
    hold({ paymentIntent: freeIntent });

    const outcome = await reconcileReservation(freeIntent);

    expect(outcome).toBe("cancelled");
    expect(paymentIntents.cancel).not.toHaveBeenCalled();
    expect(bookingFor(freeIntent)).toBeUndefined();
    expect(releaseCouponClaims).toHaveBeenCalledWith(freeIntent);
  });
});

describe("promoted — the payment already happened", () => {
  beforeEach(() => {
    stripeRefusesCancelBecauseSucceeded({
      name: "Ada Lovelace",
      email: "ada@example.com",
    });
  });

  it("confirms the reservation instead of destroying it", async () => {
    // A cancel that fails because the payment succeeded is not an error, it is
    // the answer to a different question.
    hold();

    const outcome = await reconcileReservation(PAYMENT_INTENT);

    expect(outcome).toBe("promoted");
    expect(confirmReservation).toHaveBeenCalledWith(PAYMENT_INTENT, {
      name: "Ada Lovelace",
      email: "ada@example.com",
    });
  });

  it("does not delete the row or release the claims", async () => {
    hold();

    await reconcileReservation(PAYMENT_INTENT);

    expect(bookingFor(PAYMENT_INTENT)).toBeDefined();
    expect(releaseCouponClaims).not.toHaveBeenCalled();
  });

  it("falls back to the receipt email when metadata carries none", async () => {
    paymentIntents.retrieve.mockResolvedValue({
      id: PAYMENT_INTENT,
      status: "succeeded",
      metadata: {},
      receipt_email: "fallback@example.com",
    } as any);
    hold();

    await reconcileReservation(PAYMENT_INTENT);

    expect(confirmReservation).toHaveBeenCalledWith(PAYMENT_INTENT, {
      name: undefined,
      email: "fallback@example.com",
    });
  });
});

describe("unresolved — we could not find out", () => {
  it("leaves the row blocking when the cancel fails for another reason", async () => {
    // Blocking a date we could have sold is recoverable. Selling one twice is
    // not. So an unknown answer must not free anything.
    paymentIntents.cancel.mockRejectedValue(new Error("network"));
    paymentIntents.retrieve.mockResolvedValue({
      id: PAYMENT_INTENT,
      status: "requires_payment_method",
      metadata: {},
    } as any);
    hold();

    const outcome = await reconcileReservation(PAYMENT_INTENT);

    expect(outcome).toBe("unresolved");
    expect(bookingFor(PAYMENT_INTENT)).toBeDefined();
    expect(releaseCouponClaims).not.toHaveBeenCalled();
    expect(confirmReservation).not.toHaveBeenCalled();
  });

  it("leaves the row blocking when Stripe can't be reached at all", async () => {
    paymentIntents.cancel.mockRejectedValue(new Error("network"));
    paymentIntents.retrieve.mockRejectedValue(new Error("network"));
    hold();

    const outcome = await reconcileReservation(PAYMENT_INTENT);

    expect(outcome).toBe("unresolved");
    expect(bookingFor(PAYMENT_INTENT)).toBeDefined();
  });
});

describe("what it refuses to destroy", () => {
  it("never removes a confirmed booking", async () => {
    // The delete is guarded independently of how it is called, so a mistaken
    // caller cannot take out a paid booking.
    hold({ paymentSuccess: true });

    await reconcileReservation(PAYMENT_INTENT);

    expect(bookingFor(PAYMENT_INTENT)).toBeDefined();
  });

  it("never removes a row predating the reservation scheme", async () => {
    // No reservedAt means it was never a hold, so it is not this function's
    // to delete.
    hold({ reservedAt: null });

    await reconcileReservation(PAYMENT_INTENT);

    expect(bookingFor(PAYMENT_INTENT)).toBeDefined();
  });

  it("touches only the reservation it was asked about", async () => {
    hold();
    seedBooking({ paymentIntent: "pi_someone_else", reservedAt: "2026-05-31T20:00:00.000Z" });

    await reconcileReservation(PAYMENT_INTENT);

    expect(db.bookings.map((b) => b.paymentIntent)).toEqual(["pi_someone_else"]);
  });
});
