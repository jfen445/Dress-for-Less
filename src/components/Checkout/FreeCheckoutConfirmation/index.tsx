"use client";

import React from "react";
import { ProductContext } from "..";
import Button from "@/components/Button";
import { Address } from "../../../../common/types";
import { useUserContext } from "@/context/UserContext";
import { checkValidBooking, createBooking } from "@/api/booking";
import Toast, { ToastType, ToastVariant } from "@/components/Toast";
import { useRouter } from "next/router";
import Spinner from "@/components/Spinner";
import { useCartContext } from "@/context/CartContext";
import { buildBookingList } from "../buildBookingList";

interface IFreeCheckoutConfirmation {
  address: Address | null;
  billingAddress: Address | null;
  instructions: string;
}

const FREE_COUPON_CHECKOUT_PREFIX = "FREE_COUPON_";

const FreeCheckoutConfirmation = ({
  address,
  billingAddress,
  instructions,
}: IFreeCheckoutConfirmation) => {
  const router = useRouter();
  const { userInfo } = useUserContext();
  const { refreshCart } = useCartContext();
  const { products, deliveryOption, selectedCouponIds } =
    React.useContext(ProductContext);
  const [isLoading, setIsLoading] = React.useState(false);
  const [toast, setToast] = React.useState<ToastType>({
    message: "A booking error occured. Please try again",
    variant: ToastVariant.ERROR,
    show: false,
  });

  async function handleConfirm(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);

    const sentinelPaymentIntent = `${FREE_COUPON_CHECKOUT_PREFIX}${crypto.randomUUID()}`;

    const bookingList = buildBookingList(
      products,
      deliveryOption,
      userInfo?._id ?? "",
      address,
      billingAddress,
      instructions,
      sentinelPaymentIntent,
    );

    let isValid = true;

    await checkValidBooking(bookingList)
      .then()
      .catch((err) => {
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

    await createBooking(bookingList, sentinelPaymentIntent, selectedCouponIds)
      .then(() => {
        router.push("/order-success?paymentIntent=" + sentinelPaymentIntent);
      })
      .catch((err) => {
        setToast({
          ...toast,
          message:
            err?.response?.data?.message ??
            err.message ??
            "A booking error occured. Please try again",
          variant: ToastVariant.ERROR,
          show: true,
        });
      })
      .finally(() => {
        setIsLoading(false);
        refreshCart();
      });
  }

  return (
    <>
      <Toast toast={toast} setToast={setToast} />
      <form onSubmit={handleConfirm}>
        <p className="text-sm text-gray-600">
          Your coupons cover the full cost of this order &mdash; no payment is
          required.
        </p>

        {isLoading ? (
          <div className="flex items-center justify-center">
            <Spinner message="Confirming your booking..." />
          </div>
        ) : (
          <div className="mt-10 border-t border-gray-200 pt-6 sm:flex sm:items-center sm:justify-between">
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-50 sm:order-last sm:ml-6 sm:w-auto"
            >
              Confirm free booking
            </Button>
          </div>
        )}
      </form>
    </>
  );
};

export default FreeCheckoutConfirmation;
