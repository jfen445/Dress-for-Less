import { vi } from "vitest";

// Stripe is the one dependency that must never be real here, and also the one
// whose *failure* modes carry the most meaning — reconcileReservation decides
// between destroying a reservation and promoting it purely on how a cancel
// fails. So the fake exposes the calls directly and lets each test say what
// Stripe answered.

export const paymentIntents = {
  retrieve: vi.fn(),
  update: vi.fn(),
  cancel: vi.fn(),
  create: vi.fn(),
};

export const webhooks = { constructEvent: vi.fn() };

// Must be a `function`, not an arrow: the routes call `new Stripe(key)`.
const StripeConstructor = vi.fn(function (this: any) {
  this.paymentIntents = paymentIntents;
  this.webhooks = webhooks;
});

// Covers both `import Stripe from "stripe"` and `import { Stripe } from "stripe"`.
export const stripeModule = {
  default: StripeConstructor,
  Stripe: StripeConstructor,
};

export const QUOTED_CENTS = 16_500;

export function resetStripe(quotedCents: number = QUOTED_CENTS) {
  paymentIntents.retrieve.mockReset();
  paymentIntents.update.mockReset();
  paymentIntents.cancel.mockReset();
  paymentIntents.create.mockReset();
  webhooks.constructEvent.mockReset();

  // The default world: an intent that has been created and quoted but not yet
  // confirmed — which is where every reserve expects to find it.
  paymentIntents.retrieve.mockImplementation(async (id: string) => ({
    id,
    status: "requires_payment_method",
    amount: quotedCents,
    metadata: {},
    receipt_email: null,
  }));
  paymentIntents.update.mockImplementation(async (id: string, params: any) => ({
    id,
    ...params,
  }));
  paymentIntents.cancel.mockImplementation(async (id: string) => ({
    id,
    status: "canceled",
  }));
}

// Stripe rejects a cancel on an intent that has already succeeded. That refusal
// is not an error to reconcileReservation — it is the answer to a different
// question, and the trigger for promoting the reservation instead.
export function stripeRefusesCancelBecauseSucceeded(metadata: object = {}) {
  paymentIntents.cancel.mockRejectedValue(
    Object.assign(
      new Error(
        "You cannot cancel this PaymentIntent because it has a status of succeeded.",
      ),
      { code: "payment_intent_unexpected_state" },
    ),
  );
  paymentIntents.retrieve.mockImplementation(async (id: string) => ({
    id,
    status: "succeeded",
    amount: QUOTED_CENTS,
    metadata,
    receipt_email: null,
  }));
}
