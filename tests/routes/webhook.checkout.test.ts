import { beforeEach, describe, expect, it, vi } from "vitest";
import { Readable } from "node:stream";
import { createResponse } from "node-mocks-http";
import type { NextApiRequest, NextApiResponse } from "next";
import {
  bookingFor,
  resetDb,
  seedBooking,
  seedTryOnBooking,
  seedUser,
  tryOnBookingFor,
} from "../fakes/db";
import { paymentIntents, resetStripe, webhooks } from "../fakes/stripe";
import {
  releaseCouponClaims,
  resetDaoSpies,
  sendEmail,
} from "../fakes/daos";
import { PaymentKind } from "../../common/enums/PaymentKind";

vi.mock("../../lib/db/db", () => ({ dbConnect: vi.fn(async () => undefined) }));
vi.mock("../../lib/db/schema", async () => (await import("../fakes/daos")).schemaModule);
vi.mock("../../lib/db/booking-dao", async () => (await import("../fakes/daos")).bookingDao);
vi.mock("../../lib/db/coupon-dao", async () => (await import("../fakes/daos")).couponDao);
vi.mock("../../lib/db/tryon-booking-dao", async () => (await import("../fakes/daos")).tryOnBookingDao);
vi.mock("resend", async () => (await import("../fakes/daos")).resendModule);
vi.mock("stripe", async () => (await import("../fakes/stripe")).stripeModule);

// Both confirmers are stubbed: this file is about which one the webhook picks,
// not what they do. Their behaviour is covered in confirmReservation.test.ts.
const confirmReservation = vi.fn(async () => ({ alreadyConfirmed: false }));
const confirmTryOnReservation = vi.fn(async () => ({ alreadyConfirmed: false }));
vi.mock("../../pages/api/payment/paymentConfirm", () => ({ confirmReservation }));
vi.mock("../../lib/tryOn/confirmTryOnReservation", () => ({ confirmTryOnReservation }));

const handler = (await import("../../pages/api/webhooks/checkout")).default;

const PAYMENT_INTENT = "pi_webhook_subject";

// The handler reads the raw bytes off the request stream before the signature
// is checked, so the request has to be a real stream, not a plain object.
async function deliver(
  event: unknown,
  over: { method?: string; headers?: Record<string, string> } = {},
) {
  const req = Readable.from([
    Buffer.from(JSON.stringify(event ?? {})),
  ]) as unknown as NextApiRequest;
  (req as any).method = over.method ?? "POST";
  (req as any).headers = over.headers ?? { "stripe-signature": "sig_test" };

  const res = createResponse<NextApiResponse>();

  webhooks.constructEvent.mockReturnValue(event as any);

  await handler(req, res as any);

  // A 405 ends the response without a body, so parsing is best-effort.
  const raw = res._getData();
  let body: any;
  try {
    body = raw ? JSON.parse(raw) : undefined;
  } catch {
    body = raw;
  }

  return { status: res._getStatusCode(), body };
}

const succeeded = (metadata: Record<string, string> = {}) => ({
  type: "payment_intent.succeeded",
  data: {
    object: {
      id: PAYMENT_INTENT,
      amount: 16_500,
      currency: "nzd",
      metadata,
      receipt_email: "customer@example.com",
    },
  },
});

const cancelled = () => ({
  type: "payment_intent.canceled",
  data: { object: { id: PAYMENT_INTENT } },
});

const rentalHold = () =>
  seedBooking({
    paymentIntent: PAYMENT_INTENT,
    paymentSuccess: false,
    reservedAt: "2026-05-31T21:00:00.000Z",
  });

const tryOnHold = () =>
  seedTryOnBooking({
    paymentIntent: PAYMENT_INTENT,
    paymentSuccess: false,
    reservedAt: "2026-05-31T21:00:00.000Z",
  });

const adminAlerts = () =>
  sendEmail.mock.calls.filter(([payload]) =>
    String((payload as any)?.subject ?? "").includes("ACTION NEEDED"),
  );

beforeEach(() => {
  resetDb();
  resetDaoSpies();
  resetStripe();
  confirmReservation.mockClear();
  confirmTryOnReservation.mockClear();
  webhooks.constructEvent.mockReset();
  seedUser({ email: "customer@example.com" });

  process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
});

describe("before it trusts anything", () => {
  it("rejects a request that isn't a POST", async () => {
    const { status } = await deliver(succeeded(), { method: "GET" });

    expect(status).toBe(405);
  });

  it("rejects an unsigned request", async () => {
    const { status } = await deliver(succeeded(), { headers: {} });

    expect(status).toBe(400);
  });

  it("rejects every event when no webhook secret is configured", async () => {
    // Without the secret the endpoint refuses everything, and confirmation
    // falls back to the browser alone.
    delete process.env.STRIPE_WEBHOOK_SECRET;
    rentalHold();

    const { status } = await deliver(succeeded());

    expect(status).toBe(400);
    expect(confirmReservation).not.toHaveBeenCalled();
  });

  it("rejects a bad signature without touching the booking", async () => {
    rentalHold();
    webhooks.constructEvent.mockImplementation(() => {
      throw new Error("no signatures found matching the expected signature");
    });

    const req = Readable.from([Buffer.from("{}")]) as unknown as NextApiRequest;
    (req as any).method = "POST";
    (req as any).headers = { "stripe-signature": "forged" };
    const res = createResponse<NextApiResponse>();

    await handler(req, res as any);

    expect(res._getStatusCode()).toBe(400);
    expect(confirmReservation).not.toHaveBeenCalled();
    expect(bookingFor(PAYMENT_INTENT)).toBeDefined();
  });
});

describe("payment_intent.succeeded", () => {
  it("confirms the rental hold Stripe is telling us about", async () => {
    rentalHold();

    const { status, body } = await deliver(
      succeeded({ name: "Ada", email: "ada@example.com" }),
    );

    expect(status).toBe(200);
    expect(body).toEqual({ received: true });
    expect(confirmReservation).toHaveBeenCalledWith(PAYMENT_INTENT, {
      name: "Ada",
      email: "ada@example.com",
    });
  });

  it("falls back to the receipt email when metadata carries none", async () => {
    rentalHold();

    await deliver(succeeded());

    expect(confirmReservation).toHaveBeenCalledWith(PAYMENT_INTENT, {
      name: undefined,
      email: "customer@example.com",
    });
  });

  it("routes a try-on payment to the try-on confirmer", async () => {
    // Without the kind marker every successful try-on would look like an
    // orphaned rental charge and raise an alarm.
    tryOnHold();

    await deliver(succeeded({ kind: PaymentKind.TryOn }));

    expect(confirmTryOnReservation).toHaveBeenCalledWith(PAYMENT_INTENT, {
      name: undefined,
      email: "customer@example.com",
    });
    expect(confirmReservation).not.toHaveBeenCalled();
  });

  it("checks the try-on collection before alarming about a legacy intent", async () => {
    // Rental intents created before `kind` existed carry no marker.
    tryOnHold();

    const { status } = await deliver(succeeded());

    expect(status).toBe(200);
    expect(adminAlerts()).toHaveLength(0);
    expect(confirmReservation).not.toHaveBeenCalled();
  });
});

describe("a payment with nothing behind it", () => {
  it("raises an admin alert", async () => {
    const { status } = await deliver(succeeded());

    expect(status).toBe(200);
    expect(adminAlerts()).toHaveLength(1);
    expect(adminAlerts()[0][0]).toMatchObject({
      subject: expect.stringContaining("$165.00 charged with no booking"),
    });
  });

  it("deliberately does not refund", async () => {
    // Moving money is never part of the normal machinery. An automatic refund
    // would be guessing at the resolution to a state we don't understand.
    await deliver(succeeded());

    expect(paymentIntents.cancel).not.toHaveBeenCalled();
    expect(paymentIntents.update).not.toHaveBeenCalled();
  });

  it("raises the try-on flavour of the alert for a try-on payment", async () => {
    await deliver(succeeded({ kind: PaymentKind.TryOn }));

    expect(adminAlerts()[0][0]).toMatchObject({
      subject: expect.stringContaining("try-on charged with no booking"),
    });
  });
});

describe("payment_intent.canceled", () => {
  it("drops the rental hold outright", async () => {
    // The one case where deleting without cancelling first is safe: a cancelled
    // intent can never be confirmed again.
    rentalHold();

    const { status } = await deliver(cancelled());

    expect(status).toBe(200);
    expect(bookingFor(PAYMENT_INTENT)).toBeUndefined();
  });

  it("drops the try-on hold too, without needing to know which flow it was", async () => {
    tryOnHold();

    await deliver(cancelled());

    expect(tryOnBookingFor(PAYMENT_INTENT)).toBeUndefined();
  });

  it("hands the coupon slots back even when no row was deleted", async () => {
    // A claim can outlive its reservation if the row went first, and an
    // orphaned claim holds a coupon hostage until it lapses.
    await deliver(cancelled());

    expect(releaseCouponClaims).toHaveBeenCalledWith(PAYMENT_INTENT);
  });

  it("never removes a confirmed booking", async () => {
    seedBooking({
      paymentIntent: PAYMENT_INTENT,
      paymentSuccess: true,
      reservedAt: "2026-05-31T21:00:00.000Z",
    });

    await deliver(cancelled());

    expect(bookingFor(PAYMENT_INTENT)).toBeDefined();
  });
});

describe("payment_intent.payment_failed", () => {
  it("is deliberately not handled, so the hold survives a declined card", async () => {
    // A declined card leaves the intent in requires_payment_method — still
    // confirmable, and the customer is usually about to try another card.
    // Freeing the date here is how a retry ends up charged with no booking.
    rentalHold();

    const { status } = await deliver({
      type: "payment_intent.payment_failed",
      data: { object: { id: PAYMENT_INTENT } },
    });

    expect(status).toBe(200);
    expect(bookingFor(PAYMENT_INTENT)).toBeDefined();
    expect(releaseCouponClaims).not.toHaveBeenCalled();
    expect(confirmReservation).not.toHaveBeenCalled();
  });
});

describe("when a handler fails", () => {
  it("answers 500 so Stripe retries", async () => {
    // Every handler is safe to run again, so a retry is the right response to
    // a transient failure.
    rentalHold();
    confirmReservation.mockRejectedValue(new Error("mongo unavailable"));

    const { status } = await deliver(succeeded());

    expect(status).toBe(500);
  });
});
