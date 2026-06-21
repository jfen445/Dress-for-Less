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
import { Address, Booking } from "../../../../common/types";
import { useUserContext } from "@/context/UserContext";
import { checkValidBooking, createBooking } from "@/api/booking";
import { BookingStatus } from "../../../../common/enums/BookingStatus";
import Toast, { ToastType, ToastVariant } from "@/components/Toast";
import { useRouter } from "next/router";
import Spinner from "@/components/Spinner";
import { useCartContext } from "@/context/CartContext";

interface IPaymentForm {
  clientSecret?: any;
  stripePromise?: Promise<Stripe | null>;
  isSubmitted?: boolean;
  address: Address | null;
  billingAddress: Address | null;
}

const PaymentForm = ({
  address,
  clientSecret,
  billingAddress,
}: IPaymentForm) => {
  const router = useRouter();
  const { userInfo } = useUserContext();
  const { refreshCart } = useCartContext();
  const { products, deliveryOption } = React.useContext(ProductContext);
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

    var bookingList: Booking[] = [];

    products.forEach((item) => {
      const date = item.dateBooked;

      const bookingObj: Booking = {
        userId: userInfo?._id ?? "",
        dressId: item._id,
        dateBooked: date,
        blockOutPeriod: [],
        price: parseInt(item.price),
        address: {
          company: address?.company ?? "",
          address: address?.address ?? "",
          apartment: address?.apartment ?? "",
          suburb: address?.suburb ?? "",
          city: address?.city ?? "",
          country: address?.country ?? "",
          postCode: address?.postCode ?? "",
        },
        billingAddress: {
          company: billingAddress?.company ?? "",
          address: billingAddress?.address ?? "",
          apartment: billingAddress?.apartment ?? "",
          suburb: billingAddress?.suburb ?? "",
          city: billingAddress?.city ?? "",
          country: billingAddress?.country ?? "",
          postCode: billingAddress?.postCode ?? "",
        },
        deliveryType: deliveryOption,
        tracking: "",
        isShipped: false,
        isReturned: false,
        paymentIntent: clientSecret,
        size: item.size,
        status: BookingStatus.NA,
      };

      bookingList = bookingList.concat(bookingObj);
    });

    let isValid = true;

    await checkValidBooking(bookingList)
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
          await createBooking(bookingList, paymentIntent.id)
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
