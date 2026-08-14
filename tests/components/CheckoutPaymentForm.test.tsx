import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

// The whole point of this file: the browser half of reserve-then-charge. The
// payment element itself is Stripe's and is stubbed — what matters here is the
// order the two calls happen in, and what does *not* happen when one fails.
const retrievePaymentIntent = vi.fn();
const confirmPayment = vi.fn();

vi.mock("@stripe/react-stripe-js", () => ({
  PaymentElement: () => <div data-testid="payment-element" />,
  useStripe: () => ({ retrievePaymentIntent, confirmPayment }),
  useElements: () => ({}),
}));

const reserveBooking = vi.fn();
vi.mock("@/api/booking", () => ({ reserveBooking }));

const push = vi.fn();
vi.mock("next/router", () => ({ useRouter: () => ({ push }) }));

const refreshCart = vi.fn();
vi.mock("@/context/UserContext", () => ({
  useUserContext: () => ({ userInfo: { _id: "user-1" } }),
}));
vi.mock("@/context/CartContext", () => ({
  useCartContext: () => ({ refreshCart }),
}));

// PaymentForm reads products and selected coupons off the checkout's context.
// Mocking the module gives the test the very same context object to provide.
vi.mock("@/components/Checkout", async () => {
  const react = await import("react");
  return { ProductContext: react.createContext<any>({}) };
});

const { ProductContext } = await import("@/components/Checkout");
const PaymentForm = (await import("@/components/Checkout/PaymentForm")).default;

const CLIENT_SECRET = "pi_abc_secret_xyz";
const INTENT_ID = "pi_abc";

const address = {
  address: "1 Queen St",
  suburb: "CBD",
  city: "Auckland",
  country: "NZ",
  postCode: "1010",
};

function renderForm() {
  const value = {
    products: [
      {
        _id: "dress-1",
        price: "150",
        size: "M",
        dateBooked: "2026-07-10",
        deliveryType: "Delivery",
      },
    ],
    selectedCouponIds: ["coupon-1"],
  };

  return render(
    <ProductContext.Provider value={value as any}>
      <PaymentForm
        clientSecret={CLIENT_SECRET}
        address={address as any}
        billingAddress={address as any}
        instructions=""
      />
    </ProductContext.Provider>,
  );
}

const submit = () =>
  userEvent.click(screen.getByRole("button", { name: /submit booking/i }));

beforeEach(() => {
  vi.clearAllMocks();

  retrievePaymentIntent.mockResolvedValue({
    paymentIntent: { id: INTENT_ID },
    error: null,
  });
  reserveBooking.mockResolvedValue({ data: { message: "Booking reserved" } });
  confirmPayment.mockResolvedValue({
    paymentIntent: { id: INTENT_ID, status: "succeeded" },
    error: null,
  });
});

describe("reserve, then charge", () => {
  it("reserves before it charges", async () => {
    renderForm();
    await submit();

    await waitFor(() => expect(confirmPayment).toHaveBeenCalled());

    // The ordering *is* the invariant. If these two ever swap, a coupon that
    // ran out mid-checkout takes the customer's money and gives no booking.
    expect(reserveBooking.mock.invocationCallOrder[0]).toBeLessThan(
      confirmPayment.mock.invocationCallOrder[0],
    );
  });

  it("keys the reservation to the intent resolved up front", async () => {
    // Read from retrievePaymentIntent, not off the confirm result — the
    // reservation has to exist before there is a result to read.
    renderForm();
    await submit();

    await waitFor(() =>
      expect(reserveBooking).toHaveBeenCalledWith(
        expect.objectContaining({ paymentIntent: CLIENT_SECRET }),
        INTENT_ID,
        ["coupon-1"],
      ),
    );
  });

  it("sends the customer to the confirmation page once the card clears", async () => {
    renderForm();
    await submit();

    await waitFor(() =>
      expect(push).toHaveBeenCalledWith(`/order-success?paymentIntent=${INTENT_ID}`),
    );
  });
});

describe("when the reserve fails", () => {
  beforeEach(() => {
    reserveBooking.mockRejectedValue(
      new Error("This coupon is no longer available. You have not been charged."),
    );
  });

  it("never charges the card", async () => {
    renderForm();
    await submit();

    await waitFor(() => expect(reserveBooking).toHaveBeenCalled());
    expect(confirmPayment).not.toHaveBeenCalled();
  });

  it("shows the server's reason and stays put", async () => {
    renderForm();
    await submit();

    expect(
      await screen.findByText(/coupon is no longer available/i),
    ).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });
});

describe("when the card is declined", () => {
  beforeEach(() => {
    confirmPayment.mockResolvedValue({
      paymentIntent: { id: INTENT_ID, status: "requires_payment_method" },
      error: { message: "Your card was declined." },
    });
  });

  it("leaves the reservation in place for the retry", async () => {
    // Releasing here would cancel the intent the mounted payment form is still
    // bound to, so the retry could only ever fail. The hold stays; the sweep
    // reconciles it if they walk away.
    renderForm();
    await submit();

    await waitFor(() => expect(confirmPayment).toHaveBeenCalled());
    expect(push).not.toHaveBeenCalled();
    expect(reserveBooking).toHaveBeenCalledTimes(1);
  });

  it("tells the customer what Stripe said", async () => {
    renderForm();
    await submit();

    expect(await screen.findByText(/card was declined/i)).toBeInTheDocument();
  });
});

describe("when Stripe isn't usable", () => {
  it("does not reserve when the intent can't be resolved", async () => {
    // No reservation without an intent id to key it to.
    retrievePaymentIntent.mockResolvedValue({
      paymentIntent: null,
      error: { message: "No such payment_intent" },
    });

    renderForm();
    await submit();

    await waitFor(() => expect(retrievePaymentIntent).toHaveBeenCalled());
    expect(reserveBooking).not.toHaveBeenCalled();
    expect(confirmPayment).not.toHaveBeenCalled();
  });
});
