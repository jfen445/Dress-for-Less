"use client";

import {
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import React, { FormEvent } from "react";
import { ProductContext } from "..";
import { Stripe } from "@stripe/stripe-js";
import Button from "@/components/Button";
import { Address } from "../../../../common/types";
import { useUserContext } from "@/context/UserContext";
import { reserveBooking } from "@/api/booking";
import Toast, { ToastType, ToastVariant } from "@/components/Toast";
import { useRouter } from "next/router";
import Spinner from "@/components/Spinner";
import { useCartContext } from "@/context/CartContext";
import { buildBooking } from "../buildBookingList";

interface IPaymentForm {
  clientSecret?: any;
  stripePromise?: Promise<Stripe | null>;
  isSubmitted?: boolean;
  address: Address | null;
  billingAddress: Address | null;
  instructions: string;
}

const PaymentForm = ({
  address,
  clientSecret,
  billingAddress,
  instructions,
}: IPaymentForm) => {
  const router = useRouter();
  const { userInfo } = useUserContext();
  const { refreshCart } = useCartContext();
  const { products, selectedCouponIds } = React.useContext(ProductContext);
  const stripe = useStripe();
  const elements = useElements();
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string>();
  const [toast, setToast] = React.useState<ToastType>({
    message: "A payment error occured. Please try again",
    variant: ToastVariant.ERROR,
    show: false,
  });

  const showError = (message: string) =>
    setToast({
      ...toast,
      message,
      variant: ToastVariant.ERROR,
      show: true,
    });

  // Reserve, then charge. The dress and any coupon slot are secured server-side
  // before the card is touched, so an exhausted coupon or a date that went
  // while the customer was typing stops the payment instead of being discovered
  // after their money has moved.
  async function handleSubmit(e: FormEvent) {
    setIsLoading(true);

    e.preventDefault();

    if (stripe == null || elements == null) {
      showError(
        "Something went wrong with the payment. Please refresh and try again",
      );
      setIsLoading(false);

      return;
    }

    // The reservation is keyed to this payment, so its id has to be resolved
    // before the payment is made rather than read off the result afterwards.
    const { paymentIntent: pendingIntent, error: retrieveError } =
      await stripe.retrievePaymentIntent(clientSecret);

    if (retrieveError || !pendingIntent) {
      console.error("Could not resolve payment intent:", retrieveError);
      showError(
        "Something went wrong with the payment. Please refresh and try again",
      );
      setIsLoading(false);

      return;
    }

    const booking = buildBooking(
      products,
      userInfo?._id ?? "",
      address,
      billingAddress,
      instructions,
      clientSecret,
    );

    try {
      await reserveBooking(booking, pendingIntent.id, selectedCouponIds);
    } catch (err: any) {
      console.error(err);
      showError(err.message);
      setIsLoading(false);

      return;
    }

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: "if_required",
        confirmParams: {
          return_url: `${process.env.NEXT_PUBLIC_SERVER_URL}/order-success`,
        },
      });

      if (error || paymentIntent?.status !== "succeeded") {
        if (error) console.error("Payment failed:", error);

        // The reservation is deliberately left in place. A declined card leaves
        // the intent in requires_payment_method — still confirmable — and the
        // customer is standing right here about to try another card. Releasing
        // would cancel that intent, and the payment form is still mounted
        // against its client secret, so the retry could only ever fail.
        //
        // Holding the dress for a customer who is actively paying for it is the
        // right outcome anyway. If they walk away instead, the reserve
        // reconciles their own stale hold on their next attempt, and the sweep
        // reconciles it regardless once it lapses.
        showError(error?.message ?? "A payment error occured. Please try again");

        return;
      }

      router.push("/order-success?paymentIntent=" + paymentIntent.id);
    } finally {
      setIsLoading(false);
      refreshCart();
    }
  }

  return (
    <>
      <Toast toast={toast} setToast={setToast} />
      <>
        <form onSubmit={handleSubmit}>
          <PaymentElement />
          {/* <div className="mt-4">
            <LinkAuthenticationElement
              onChange={(e) => setEmail(e.value.email)}
            />
          </div> */}

          {isLoading ? (
            <div className="flex items-center justify-center">
              <Spinner message="Processing your payment..." />
            </div>
          ) : (
            <>
              <div className="mt-10 border-t border-gray-200 pt-6 sm:flex sm:items-center sm:justify-between">
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-50 sm:order-last sm:ml-6 sm:w-auto"
                >
                  Submit Booking
                </Button>
                <p className="mt-4 text-center text-sm text-gray-500 sm:mt-0 sm:text-left"></p>
              </div>
            </>
          )}
        </form>
      </>
    </>
  );
};

export default PaymentForm;
