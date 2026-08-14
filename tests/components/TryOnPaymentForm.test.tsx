import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const retrievePaymentIntent = vi.fn();
const confirmPayment = vi.fn();

vi.mock("@stripe/react-stripe-js", () => ({
  PaymentElement: () => <div data-testid="payment-element" />,
  useStripe: () => ({ retrievePaymentIntent, confirmPayment }),
  useElements: () => ({}),
}));

const reserveTryOnBooking = vi.fn();
const confirmTryOnBooking = vi.fn();
vi.mock("@/api/tryOnBooking", () => ({
  reserveTryOnBooking,
  confirmTryOnBooking,
}));

const TryOnPaymentForm = (await import("@/components/TryOn/PaymentForm")).default;

const CLIENT_SECRET = "pi_tryon_secret_xyz";
const INTENT_ID = "pi_tryon";

const onSuccess = vi.fn();

function renderForm() {
  return render(
    <TryOnPaymentForm
      clientSecret={CLIENT_SECRET}
      date="2026-07-10"
      timeSlot="18:30"
      name="Ada Lovelace"
      phone="021 000 0000"
      onSuccess={onSuccess}
    />,
  );
}

const submit = () =>
  userEvent.click(screen.getByRole("button", { name: /confirm try-on booking/i }));

beforeEach(() => {
  vi.clearAllMocks();

  retrievePaymentIntent.mockResolvedValue({
    paymentIntent: { id: INTENT_ID },
    error: null,
  });
  reserveTryOnBooking.mockResolvedValue({ data: { message: "reserved" } });
  confirmPayment.mockResolvedValue({
    paymentIntent: { id: INTENT_ID, status: "succeeded" },
    error: null,
  });
  confirmTryOnBooking.mockResolvedValue({ data: { message: "confirmed" } });
});

describe("reserve, then charge", () => {
  it("holds the slot before it charges", async () => {
    renderForm();
    await submit();

    await waitFor(() => expect(confirmPayment).toHaveBeenCalled());

    expect(reserveTryOnBooking.mock.invocationCallOrder[0]).toBeLessThan(
      confirmPayment.mock.invocationCallOrder[0],
    );
  });

  it("reserves the slot the customer picked, against their own intent", async () => {
    renderForm();
    await submit();

    await waitFor(() =>
      expect(reserveTryOnBooking).toHaveBeenCalledWith({
        date: "2026-07-10",
        timeSlot: "18:30",
        name: "Ada Lovelace",
        phone: "021 000 0000",
        paymentIntent: INTENT_ID,
      }),
    );
  });

  it("confirms and reports success once the card clears", async () => {
    renderForm();
    await submit();

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(confirmTryOnBooking).toHaveBeenCalledWith(INTENT_ID);
  });
});

describe("when the slot has gone", () => {
  beforeEach(() => {
    reserveTryOnBooking.mockRejectedValue({
      response: { data: { message: "This time slot has already been booked" } },
    });
  });

  it("never charges the card", async () => {
    // The whole reason the reserve runs first: a slot taken while the customer
    // was typing stops the payment rather than being discovered after it.
    renderForm();
    await submit();

    await waitFor(() => expect(reserveTryOnBooking).toHaveBeenCalled());
    expect(confirmPayment).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it("surfaces the server's reason", async () => {
    renderForm();
    await submit();

    expect(
      await screen.findByText(/time slot has already been booked/i),
    ).toBeInTheDocument();
  });
});

describe("when the card is declined", () => {
  beforeEach(() => {
    confirmPayment.mockResolvedValue({
      paymentIntent: { id: INTENT_ID, status: "requires_payment_method" },
      error: { message: "Your card was declined." },
    });
  });

  it("leaves the hold in place and does not confirm", async () => {
    renderForm();
    await submit();

    await waitFor(() => expect(confirmPayment).toHaveBeenCalled());
    expect(confirmTryOnBooking).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
    expect(reserveTryOnBooking).toHaveBeenCalledTimes(1);
  });

  it("tells the customer what Stripe said", async () => {
    renderForm();
    await submit();

    expect(await screen.findByText(/card was declined/i)).toBeInTheDocument();
  });
});

describe("when the confirmation call fails after a successful charge", () => {
  it("still reports success, because the webhook finishes the job", async () => {
    // The payment succeeded and the hold is already theirs. Treating this as a
    // failed booking would be a lie to a customer who has paid — Stripe's
    // webhook calls the same confirm.
    confirmTryOnBooking.mockRejectedValue(new Error("network"));

    renderForm();
    await submit();

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
  });
});

describe("when Stripe isn't usable", () => {
  it("does not reserve when the intent can't be resolved", async () => {
    retrievePaymentIntent.mockResolvedValue({
      paymentIntent: null,
      error: { message: "No such payment_intent" },
    });

    renderForm();
    await submit();

    await waitFor(() => expect(retrievePaymentIntent).toHaveBeenCalled());
    expect(reserveTryOnBooking).not.toHaveBeenCalled();
    expect(confirmPayment).not.toHaveBeenCalled();
  });
});
