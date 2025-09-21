"use client";

import {
  LinkAuthenticationElement,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import axios from "axios";
import React, { FormEvent } from "react";
import { ProductContext } from "..";
import { Stripe } from "@stripe/stripe-js";
import Button from "@/components/Button";
import { Address, Booking } from "../../../../common/types";
import { useUserContext } from "@/context/UserContext";
import { createBooking } from "@/api/booking";
import dayjs from "dayjs";
import { removeFromCart } from "@/api/cart";

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
  const { userInfo } = useUserContext();
  const { products, deliveryOption } = React.useContext(ProductContext);
  const stripe = useStripe();
  const elements = useElements();
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string>();
  const [email, setEmail] = React.useState<string>();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (stripe == null || elements == null || email == null) return;

    setIsLoading(true);

    var bookingList: Booking[] = [];

    products.forEach((item) => {
      const date = item.dateBooked;

      const day = dayjs(date).subtract(1, "day").day();

      let dates: string[] = [];

      if (day == 5) {
        const fri = dayjs(date).toJSON();
        const sat = dayjs(date).add(1, "day").toJSON();
        dates = [fri, sat];
      }

      if (day == 6) {
        const fri = dayjs(date).subtract(1, "day").toJSON();
        const sat = dayjs(date).toJSON();
        dates = [fri, sat];
      }

      const bookingObj: Booking = {
        userId: userInfo?._id ?? "",
        dressId: item._id,
        dateBooked: date,
        blockOutPeriod: dates,
        price: parseInt(item.price),
        address: address?.address ?? "",
        city: address?.city ?? "",
        country: address?.country ?? "",
        postCode: address?.postCode ?? "",
        deliveryType: deliveryOption,
        tracking: "",
        isShipped: false,
        isReturned: false,
        paymentIntent: clientSecret,
        size: item.size,
      };

      bookingList = bookingList.concat(bookingObj);
    });

    await createBooking(bookingList)
      .then(async (data) => {
        products.forEach(async (product) => {
          await removeFromCart(product.cartItemId);
        });
      })
      .catch((err) => console.error(err));

    stripe
      .confirmPayment({
        elements,
        confirmParams: {
          return_url: `${process.env.NEXT_PUBLIC_SERVER_URL}/order-success`,
        },
      })
      .then(({ error }) => {
        if (error.type === "card_error" || error.type === "validation_error") {
          setErrorMessage(error.message);
        } else {
          setErrorMessage("An unknown error occurred");
        }
      })
      .finally(() => setIsLoading(false));
  }

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement />
      <div className="mt-4">
        <LinkAuthenticationElement onChange={(e) => setEmail(e.value.email)} />
      </div>

      <div className="mt-10 border-t border-gray-200 pt-6 sm:flex sm:items-center sm:justify-between">
        <Button
          type="submit"
          className="w-full rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-50 sm:order-last sm:ml-6 sm:w-auto"
        >
          Submit Booking
        </Button>
        <p className="mt-4 text-center text-sm text-gray-500 sm:mt-0 sm:text-left"></p>
      </div>
    </form>
  );
};

export default PaymentForm;
