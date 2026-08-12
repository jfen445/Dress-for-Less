"use client";

import {
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import React, { FormEvent } from "react";
import Button from "@/components/Button";
import Spinner from "@/components/Spinner";
import Toast, { ToastType, ToastVariant } from "@/components/Toast";
import {
  confirmTryOnBooking,
  reserveTryOnBooking,
} from "@/api/tryOnBooking";

interface ITryOnPaymentForm {
  clientSecret: string;
  date: string;
  timeSlot: string;
  name: string;
  phone: string;
  onSuccess: () => void;
}

const TryOnPaymentForm = ({
  clientSecret,
  date,
  timeSlot,
  name,
  phone,
  onSuccess,
}: ITryOnPaymentForm) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isLoading, setIsLoading] = React.useState(false);
  const [toast, setToast] = React.useState<ToastType>({
    message: "",
    variant: ToastVariant.ERROR,
    show: false,
  });

  const showError = (message: string) =>
    setToast({
      message,
      variant: ToastVariant.ERROR,
      show: true,
    });

  // Reserve, then charge. The slot is held server-side before the card is
  // touched, so an appointment that goes while the customer is typing stops the
  // payment instead of being discovered after their money has moved.
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setIsLoading(true);

    if (stripe == null || elements == null) {
      showError(
        "Something went wrong with the payment. Please refresh and try again",
      );
      setIsLoading(false);
      return;
    }

    try {
      // The reservation is keyed to this payment, so its id has to be resolved
      // before the payment is made rather than read off the result afterwards.
      const { paymentIntent: pendingIntent, error: retrieveError } =
        await stripe.retrievePaymentIntent(clientSecret);

      if (retrieveError || !pendingIntent) {
        console.error("Could not resolve payment intent:", retrieveError);
        showError(
          "Something went wrong with the payment. Please refresh and try again",
        );
        return;
      }

      try {
        await reserveTryOnBooking({
          date,
          timeSlot,
          name,
          phone,
          paymentIntent: pendingIntent.id,
        });
      } catch (err: any) {
        // Nothing has been charged. A slot taken by somebody else surfaces
        // here, which is the whole reason this runs first.
        showError(
          err?.response?.data?.message ??
            "We couldn't hold that time slot. Please pick another and try again.",
        );
        return;
      }

      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: "if_required",
      });

      if (error || paymentIntent?.status !== "succeeded") {
        if (error) console.error("Payment failed:", error);

        // The hold is deliberately left in place. A declined card leaves the
        // intent in requires_payment_method — still confirmable — and the
        // customer is standing right here about to try another card. Releasing
        // would cancel that intent, and the payment form is still mounted
        // against its client secret, so the retry could only ever fail.
        //
        // Holding a slot for a customer who is actively paying for it is the
        // right outcome anyway. If they walk away instead, the reserve
        // reconciles their own stale hold on their next attempt, and the sweep
        // reconciles it regardless once it lapses.
        showError(error?.message ?? "A payment error occured. Please try again");
        return;
      }

      try {
        await confirmTryOnBooking(paymentIntent.id);
      } catch (err) {
        // The payment succeeded and the hold is already theirs, so this is not
        // a failed booking — only a confirmation that didn't get acknowledged
        // here. Stripe's webhook calls the same confirm and will finish the job.
        console.error("Try-on confirmation call failed", err);
      }

      onSuccess();
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <Toast toast={toast} setToast={setToast} />
      <form onSubmit={handleSubmit}>
        <PaymentElement />
        {isLoading ? (
          <div className="flex items-center justify-center">
            <Spinner message="Processing your payment..." />
          </div>
        ) : (
          <div className="mt-6 border-t border-gray-200 pt-6">
            <Button type="submit" className="w-full">
              Confirm try-on booking
            </Button>
          </div>
        )}
      </form>
    </>
  );
};

export default TryOnPaymentForm;
