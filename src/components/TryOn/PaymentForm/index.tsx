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
import { createTryOnBooking } from "@/api/tryOnBooking";

interface ITryOnPaymentForm {
  date: string;
  timeSlot: string;
  name: string;
  phone: string;
  onSuccess: () => void;
}

const TryOnPaymentForm = ({
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

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setIsLoading(true);

    if (stripe == null || elements == null) {
      setToast({
        message:
          "Something went wrong with the payment. Please refresh and try again",
        variant: ToastVariant.ERROR,
        show: true,
      });
      setIsLoading(false);
      return;
    }

    stripe
      .confirmPayment({
        elements,
        redirect: "if_required",
      })
      .then(async ({ error, paymentIntent }) => {
        if (error) {
          setToast({
            message:
              error?.message ?? "A payment error occured. Please try again",
            variant: ToastVariant.ERROR,
            show: true,
          });
          return;
        }

        if (paymentIntent && paymentIntent.status === "succeeded") {
          await createTryOnBooking({
            date,
            timeSlot,
            name,
            phone,
            paymentIntent: paymentIntent.id,
          })
            .then(() => onSuccess())
            .catch((err) => {
              setToast({
                message:
                  err?.response?.data?.message ??
                  "Something went wrong confirming your booking. Please contact us.",
                variant: ToastVariant.ERROR,
                show: true,
              });
            });
        }
      })
      .finally(() => setIsLoading(false));
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
