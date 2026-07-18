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
import { checkValidBooking, createBooking } from "@/api/booking";
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

  async function handleSubmit(e: FormEvent) {
    setIsLoading(true);

    e.preventDefault();

    if (stripe == null || elements == null) {
      setToast({
        ...toast,
        message:
          "Something went wrong with the payment. Please refresh and try again",
        variant: ToastVariant.ERROR,
        show: true,
      });
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

    let isValid = true;

    await checkValidBooking(booking)
      .then()
      .catch((err) => {
        console.error(err);
        setToast({
          ...toast,
          message: err.message,
          variant: ToastVariant.ERROR,
          show: true,
        });
        isValid = false;
      });

    if (!isValid) {
      setIsLoading(false);
      return;
    }

    stripe
      .confirmPayment({
        elements,
        redirect: "if_required",
        confirmParams: {
          return_url: `${process.env.NEXT_PUBLIC_SERVER_URL}/order-success`,
        },
      })
      .then(async ({ error, paymentIntent }) => {
        if (error) {
          console.error("Payment failed:", error);
          setToast({
            ...toast,
            message:
              error?.message ?? "A payment error occured. Please try again",
            variant: ToastVariant.ERROR,
            show: true,
          });
        }

        if (paymentIntent && paymentIntent.status === "succeeded") {
          await createBooking(booking, paymentIntent.id, selectedCouponIds)
            .then(() => {
              router.push("/order-success?paymentIntent=" + paymentIntent.id);
            })
            .catch((err) => {
              console.error(err);
              setToast({
                ...toast,
                message: err.message,
                variant: ToastVariant.ERROR,
                show: true,
              });
            });
        }
      })
      .finally(() => {
        setIsLoading(false);
        refreshCart();
      });
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
