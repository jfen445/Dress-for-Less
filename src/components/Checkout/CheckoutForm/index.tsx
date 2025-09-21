"use client";

import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { Address } from "../../../../common/types";
import Input from "@/components/Input";
import { useSession } from "next-auth/react";
import PaymentForm from "../PaymentForm";
import Button from "@/components/Button";
import React from "react";
import { ProductContext } from "..";
import { getClientSecret } from "@/api/payment";
import AddressForm from "./AddressForm";
import BillingForm from "./BillingForm";

const deliveryMethods = [
  { id: "delivery", title: "Full delivery ($15)" },
  { id: "pickup", title: "Full pick up (Free)" },
  { id: "pickup/delivery", title: "Pick up and delivery return ($7.50)" },
  { id: "delivery/pickup", title: "Delivery and drop off ($7.50)" },
];

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY!);

const CheckoutForm = () => {
  const { data: session } = useSession();
  const { products, deliveryOption, setDeliveryOption, totalPrice } =
    React.useContext(ProductContext);
  const [clientSecret, setClientSecret] = React.useState<string>();
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string>();

  const [isSubmitted, setIsSubmitted] = React.useState(false);
  const [payment, setPayment] = React.useState(false);
  const [userAddress, setUserAddress] = React.useState<Address | null>(null);
  const [sameAsShipping, setSameAsShipping] = React.useState(true);
  const [billingAddress, setBillingAddress] = React.useState<Address | null>(
    null
  );
  const [addressError, setAddressError] = React.useState<boolean>(false);

  const email =
    session && session.user && session.user.email ? session.user.email : "";

  const getSecret = async () => {
    await getClientSecret(totalPrice.toString())
      .then((data) => {
        setClientSecret(data?.data.clientSecret);
      })
      .catch((err) => setErrorMessage(err.message));
  };

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const form = event.currentTarget;

    const formElements = form.elements as typeof form.elements & {
      address: { value: string };
      suburb: { value: string };
      city: { value: string };
      region: { value: string };
      postCode: { value: string };
    };

    if (
      !formElements.address.value ||
      !formElements.suburb.value ||
      !formElements.city.value ||
      !formElements.region.value ||
      !formElements.postCode.value
    ) {
      setAddressError(true);
      return;
    }

    const address: Address = {
      address: formElements.address.value,
      suburb: formElements.suburb.value,
      city: formElements.city.value,
      country: formElements.region.value,
      postCode: formElements.postCode.value,
    };

    const billingFormElements = form.elements as typeof form.elements & {
      billingAddress: { value: string };
      billingSuburb: { value: string };
      billingCity: { value: string };
      billingRegion: { value: string };
      billingPostCode: { value: string };
    };

    const billingAddress: Address = !sameAsShipping
      ? {
          address: billingFormElements.billingAddress.value,
          suburb: billingFormElements.billingSuburb.value,
          city: billingFormElements.billingCity.value,
          country: billingFormElements.billingRegion.value,
          postCode: billingFormElements.billingPostCode.value,
        }
      : address;

    setUserAddress(address);
    setBillingAddress(billingAddress);
    setAddressError(false);

    setPayment(true);
    getSecret();
  };

  const isBeforeWednesdayNoon = () => {
    const now = new Date(); // Get the current date and time

    // Get the current week’s Wednesday
    const nextWednesday = new Date();
    nextWednesday.setDate(now.getDate() + ((3 - now.getDay() + 7) % 7)); // 3 represents Wednesday (0 is Sunday)

    // Set Wednesday to 12 PM (noon)
    nextWednesday.setHours(12, 0, 0, 0); // 12 PM, 0 minutes, 0 seconds, 0 milliseconds

    // Compare current time to next Wednesday 12 PM
    return now < nextWednesday;
  };

  const isThisWeekendBookings = () => {
    const dates = products.map((item) => item.dateBooked);
    const now = new Date();

    // Get current week's Sunday at 11:59:59.999 PM
    const currentSunday = new Date(now);
    if (now.getDay() !== 0) {
      currentSunday.setDate(now.getDate() + (7 - now.getDay()));
    }
    currentSunday.setHours(23, 59, 59, 999);

    return dates.some((dateStr) => {
      const date = new Date(dateStr);
      return date >= now && date <= currentSunday;
    });
  };

  const isDeliveryInvalid = (id: string) => {
    return (
      !isBeforeWednesdayNoon() &&
      isThisWeekendBookings() &&
      id.includes("delivery")
    );
  };

  const isBookingValid = () => {
    const currentDayOfWeek = new Date().getDay();

    const isValid = currentDayOfWeek >= 1 && currentDayOfWeek <= 4;

    return (isThisWeekendBookings() && isValid) || !isThisWeekendBookings();
  };

  const RadioGroup = () => {
    return (
      <div>
        <p className="mt-1 text-sm leading-6 text-gray-600">
          Select a delivery or pick up option
        </p>
        <div className="mt-6 space-y-6">
          {isBookingValid() ? (
            <>
              {deliveryMethods.map((deliveryMethod) => (
                <>
                  {isDeliveryInvalid(deliveryMethod.id) ? null : (
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
                  )}
                </>
              ))}
            </>
          ) : (
            <div className="bg-red-100 p-2 rounded-md">
              Unfortunately you are no longer able to book for this weekend.
              Please select another date or contact us for support
            </div>
          )}
        </div>
      </div>
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
            {isBookingValid() && (
              <>
                {deliveryOption !== "pickup" && (
                  <section aria-labelledby="shipping-heading" className="mt-10">
                    <h2
                      id="shipping-heading"
                      className="text-lg font-medium text-gray-900"
                    >
                      Shipping address
                    </h2>

                    <AddressForm />

                    {addressError && (
                      <div className="mt-2 text-sm text-red-600">
                        Please fill in all required fields with a valid address.
                      </div>
                    )}
                  </section>
                )}

                <section aria-labelledby="billing-heading" className="mt-10">
                  <h2
                    id="billing-heading"
                    className="text-lg font-medium text-gray-900"
                  >
                    Billing information
                  </h2>

                  {deliveryOption !== "pickup" && (
                    <div className="mt-6 flex items-center">
                      <input
                        checked={sameAsShipping}
                        onChange={() => setSameAsShipping(!sameAsShipping)}
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
                  )}

                  {!sameAsShipping ||
                    (deliveryOption === "pickup" && <BillingForm />)}
                </section>
              </>
            )}
          </div>
          {isBookingValid() && (
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
          )}
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
                  billingAddress={billingAddress}
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
