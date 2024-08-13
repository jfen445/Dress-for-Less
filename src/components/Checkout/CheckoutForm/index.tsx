"use client";

// import { userOrderExists } from "@/app/actions/orders";
// import { Button } from "@/components/ui/button";
// import {
//   Card,
//   CardContent,
//   CardDescription,
//   CardFooter,
//   CardHeader,
//   CardTitle,
// } from "@/components/ui/card";
// import { formatCurrency } from "@/lib/formatters";
import {
  Elements,
  LinkAuthenticationElement,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { loadStripe, StripeElementsOptions } from "@stripe/stripe-js";
import Image from "next/image";
import { FormEvent, useState } from "react";
import { Address, CartItemType } from "../../../../common/types";
import Input from "@/components/Input";
import { useSession } from "next-auth/react";
import PaymentForm from "../PaymentForm";
import Button from "@/components/Button";
import React from "react";
import { ProductContext } from "..";
import { getClientSecret } from "@/api/payment";
import client from "../../../../sanity/sanity.client";

const deliveryMethods = [
  { id: "delivery", title: "Full delivery" },
  { id: "pickup", title: "Full pick up" },
  { id: "pickup/delivery", title: "Pick up and delivery return" },
  { id: "delivery/pickup", title: "Delivery and drop off" },
];

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY!);

const CheckoutForm = () => {
  const { data: session } = useSession();
  const { deliveryOption, setDeliveryOption, totalPrice } =
    React.useContext(ProductContext);
  const [clientSecret, setClientSecret] = React.useState<string>();
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string>();

  const [isSubmitted, setIsSubmitted] = React.useState(false);
  const [payment, setPayment] = React.useState(false);
  const [userAddress, setUserAddress] = React.useState<Address | null>(null);

  const email =
    session && session.user && session.user.email ? session.user.email : "";

  const getSecret = async () => {
    await getClientSecret(totalPrice.toString())
      .then((data) => {
        console.log(":this is the data", totalPrice.toString(), data?.data);
        setClientSecret(data?.data.clientSecret);
      })
      .catch((err) => setErrorMessage(err.message));
  };

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPayment(true);
    getSecret();

    const form = event.currentTarget;

    const formElements = form.elements as typeof form.elements & {
      address: { value: string };
      city: { value: string };
      region: { value: string };
      postCode: { value: string };
    };

    const address: Address = {
      address: formElements.address.value,
      city: formElements.city.value,
      country: formElements.region.value,
      postCode: formElements.postCode.value,
    };

    setUserAddress(address);
  };

  const RadioGroup = () => {
    return (
      <fieldset>
        <p className="mt-1 text-sm leading-6 text-gray-600">
          Select a delivery or pick up option
        </p>
        <div className="mt-6 space-y-6">
          {deliveryMethods.map((deliveryMethod) => (
            <div key={deliveryMethod.id} className="flex items-center">
              <input
                checked={deliveryMethod.id === deliveryOption}
                id={deliveryMethod.id}
                name="notification-method"
                type="radio"
                className="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-600"
                onChange={(e) => setDeliveryOption(e.target.id)}
              />
              <label
                htmlFor={deliveryMethod.id}
                className="ml-3 block text-sm font-medium leading-6 text-gray-900"
              >
                {deliveryMethod.title}
              </label>
            </div>
          ))}
        </div>
      </fieldset>
    );
  };

  return (
    <>
      {!payment ? (
        <form
          onSubmit={onSubmit}
          className="px-4 mb-10 pt-16 sm:px-6 lg:col-start-1 lg:row-start-1 lg:px-0"
        >
          <div className="mx-auto max-w-lg lg:max-w-none">
            <section aria-labelledby="contact-info-heading">
              <h2
                id="contact-info-heading"
                className="text-lg font-medium text-gray-900"
              >
                Contact information
              </h2>

              <div className="mt-6">
                <label
                  htmlFor="email-address"
                  className="block text-sm font-medium text-gray-700"
                >
                  Email address
                </label>
                <div className="mt-1">
                  <Input
                    value={email}
                    id="email-address"
                    name="email-address"
                    type="email"
                    disabled
                  />
                </div>
              </div>
            </section>

            <section aria-labelledby="shipping-heading" className="mt-10">
              <h2
                id="shipping-heading"
                className="text-lg font-medium text-gray-900"
              >
                Delivery Options
              </h2>
              <RadioGroup />
            </section>

            <section aria-labelledby="shipping-heading" className="mt-10">
              <h2
                id="shipping-heading"
                className="text-lg font-medium text-gray-900"
              >
                Shipping address
              </h2>

              <div className="mt-6 grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-3">
                <div className="sm:col-span-3">
                  <label
                    htmlFor="address"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Address
                  </label>
                  <div className="mt-1">
                    <Input
                      id="address"
                      name="address"
                      type="text"
                      autoComplete="street-address"
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="city"
                    className="block text-sm font-medium text-gray-700"
                  >
                    City
                  </label>
                  <div className="mt-1">
                    <Input
                      id="city"
                      name="city"
                      type="text"
                      autoComplete="address-level2"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="region"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Country
                  </label>
                  <div className="mt-1">
                    <Input
                      value={"New Zealand"}
                      id="region"
                      name="region"
                      type="text"
                      autoComplete="address-level1"
                      disabled
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="postal-code"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Postal code
                  </label>
                  <div className="mt-1">
                    <Input
                      id="postCode"
                      name="postCode"
                      type="text"
                      autoComplete="postal-code"
                    />
                  </div>
                </div>
              </div>
            </section>

            <section aria-labelledby="billing-heading" className="mt-10">
              <h2
                id="billing-heading"
                className="text-lg font-medium text-gray-900"
              >
                Billing information
              </h2>

              <div className="mt-6 flex items-center">
                <input
                  defaultChecked
                  id="same-as-shipping"
                  name="same-as-shipping"
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <div className="ml-2">
                  <label
                    htmlFor="same-as-shipping"
                    className="text-sm font-medium text-gray-900"
                  >
                    Same as shipping information
                  </label>
                </div>
              </div>
            </section>
          </div>

          <div className="mt-10 border-t border-gray-200 pt-6 sm:flex sm:items-center sm:justify-between">
            <Button
              type="submit"
              className="w-full rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-50 sm:order-last sm:ml-6 sm:w-auto"
            >
              Continue to payment
            </Button>
            <p className="mt-4 text-center text-sm text-gray-500 sm:mt-0 sm:text-left">
              You wont be charged until the next step.
            </p>
          </div>
        </form>
      ) : (
        <section
          aria-labelledby="payment-heading"
          className="px-4 mb-10 pt-16 sm:px-6 lg:col-start-1 lg:row-start-1 lg:px-0"
        >
          <h2
            id="payment-heading"
            className="text-lg font-medium text-gray-900"
          >
            Payment details
          </h2>

          <div className="mt-6">
            {clientSecret && (
              <Elements options={{ clientSecret }} stripe={stripePromise}>
                <PaymentForm
                  clientSecret={clientSecret}
                  stripePromise={stripePromise}
                  isSubmitted={isSubmitted}
                  address={userAddress}
                />
              </Elements>
            )}
          </div>
        </section>
      )}
    </>
  );
};

export default CheckoutForm;
