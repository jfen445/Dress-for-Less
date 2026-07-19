"use client";

import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { Address } from "../../../../common/types";
import Input from "@/components/Input";
import { useSession } from "next-auth/react";
import PaymentForm from "../PaymentForm";
import FreeCheckoutConfirmation from "../FreeCheckoutConfirmation";
import Button from "@/components/Button";
import React from "react";
import dayjs from "dayjs";
import { ProductContext } from "..";
import { getClientSecret } from "@/api/payment";
import AddressForm from "./AddressForm";
import BillingForm from "./BillingForm";
import TermsModal from "../TermsModal";
import { DeliveryType } from "../../../../common/enums/DeliveryType";
import {
  hasDeliveryItem,
  isDeliveryAllowedForDate,
  isDateWithinCurrentWeekend,
} from "../../../../lib/utils/deliveryRules";
import { auckland } from "../../../../lib/utils/timezone";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY!);

const CheckoutForm = () => {
  const { data: session } = useSession();
  const {
    products,
    totalPrice,
    availableCoupons,
    selectedCouponIds,
    setSelectedCouponIds,
    validatedAddress,
  } = React.useContext(ProductContext);
  const [clientSecret, setClientSecret] = React.useState<string>();
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string>();

  const [isSubmitted, setIsSubmitted] = React.useState(false);
  const [payment, setPayment] = React.useState(false);
  const [isFreeCheckout, setIsFreeCheckout] = React.useState(false);
  const [userAddress, setUserAddress] = React.useState<Address | null>(null);
  const [sameAsShipping, setSameAsShipping] = React.useState(true);
  const [billingAddress, setBillingAddress] = React.useState<Address | null>(
    null,
  );
  const [instructions, setInstructions] = React.useState("");
  const [addressError, setAddressError] = React.useState<boolean>(false);
  const [billingAddressError, setBillingAddressError] =
    React.useState<boolean>(false);
  const [termsAccepted, setTermsAccepted] = React.useState<boolean>(false);
  const [termsError, setTermsError] = React.useState<boolean>(false);
  const [termsModalOpen, setTermsModalOpen] = React.useState<boolean>(false);
  const [deliveryError, setDeliveryError] = React.useState<string>();

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
    let isError = false;
    event.preventDefault();

    const form = event.currentTarget;

    const formElements = form.elements as typeof form.elements & {
      company: { value: string };
      address: { value: string };
      apartment: { value: string };
      suburb: { value: string };
      city: { value: string };
      region: { value: string };
      postCode: { value: string };
      billingCompany: { value: string };
      billingAddress: { value: string };
      billingApartment: { value: string };
      billingSuburb: { value: string };
      billingCity: { value: string };
      billingRegion: { value: string };
      billingPostCode: { value: string };
      instructions?: { value: string };
    };

    if (!termsAccepted) {
      isError = true;
      setTermsError(true);
    } else {
      setTermsError(false);
    }

    const invalidDeliveryItems = products.filter(
      (product) =>
        product.deliveryType === DeliveryType.Delivery &&
        !isDeliveryAllowedForDate(product.dateBooked),
    );

    if (invalidDeliveryItems.length > 0) {
      isError = true;
      setDeliveryError(
        `Delivery is no longer available for: ${invalidDeliveryItems
          .map((item) => item.name)
          .join(", ")}. Please go back and switch ${
          invalidDeliveryItems.length > 1 ? "these items" : "this item"
        } to pickup.`,
      );
    } else {
      setDeliveryError(undefined);
    }

    const isDelivery = hasDeliveryItem(products);

    if (isDelivery) {
      if (
        !formElements.address.value ||
        !formElements.suburb.value ||
        !formElements.region.value ||
        !formElements.postCode.value
      ) {
        isError = true;
        setAddressError(true);
      } else {
        setAddressError(false);
      }
    }

    const isAddressStillValid =
      validatedAddress !== null &&
      validatedAddress.addressText === formElements.address.value;

    const address: Address | null = !isDelivery
      ? null
      : {
          company: formElements.company.value,
          address: formElements.address.value,
          apartment: formElements.apartment.value,
          suburb: formElements.suburb.value,
          city: formElements.city.value,
          country: formElements.region.value,
          postCode: formElements.postCode.value,
          nzPostAddressId: isAddressStillValid
            ? validatedAddress!.nzPostAddressId
            : undefined,
          nzPostDpid: isAddressStillValid
            ? validatedAddress!.nzPostDpid
            : undefined,
          isRuralDelivery: isAddressStillValid
            ? validatedAddress!.isRuralDelivery
            : false,
          ruralDeliveryNumber: isAddressStillValid
            ? validatedAddress!.ruralDeliveryNumber
            : undefined,
        };

    if (
      !sameAsShipping &&
      (!formElements.billingAddress.value ||
        !formElements.billingSuburb.value ||
        !formElements.billingCity.value ||
        !formElements.billingRegion.value ||
        !formElements.billingPostCode.value)
    ) {
      setBillingAddressError(true);
      isError = true;
    } else {
      setBillingAddressError(false);
    }

    if (isError) return;

    const billingAddress: Address | null = !sameAsShipping
      ? {
          company: formElements.billingCompany.value,
          address: formElements.billingAddress.value,
          apartment: formElements.billingApartment.value,
          suburb: formElements.billingSuburb.value,
          city: formElements.billingCity.value,
          country: formElements.billingRegion.value,
          postCode: formElements.billingPostCode.value,
        }
      : address;

    setUserAddress(address);
    setBillingAddress(billingAddress);
    setInstructions(formElements.instructions?.value ?? "");
    setAddressError(false);
    setBillingAddressError(false);
    setTermsError(false);

    setPayment(true);

    if (totalPrice <= 0) {
      setIsFreeCheckout(true);
    } else {
      setIsFreeCheckout(false);
      getSecret();
    }
  };

  const isThisWeekendBookings = () => {
    const now = auckland.now();
    return products.some((item) =>
      isDateWithinCurrentWeekend(item.dateBooked, now),
    );
  };

  const isBookingValid = () => {
    const currentDayOfWeek = auckland.now().day();

    const isValid = currentDayOfWeek >= 1 && currentDayOfWeek <= 4;

    return (isThisWeekendBookings() && isValid) || !isThisWeekendBookings();
  };

  const toggleCoupon = (couponId: string) => {
    setSelectedCouponIds((prev) =>
      prev.includes(couponId)
        ? prev.filter((id) => id !== couponId)
        : [...prev, couponId],
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

            {deliveryError && (
              <div className="mt-4 bg-red-100 p-2 rounded-md text-sm text-red-700">
                {deliveryError}
              </div>
            )}

            {availableCoupons.length > 0 && (
              <section aria-labelledby="coupons-heading" className="mt-10">
                <h2
                  id="coupons-heading"
                  className="text-lg font-medium text-gray-900"
                >
                  Coupons
                </h2>
                <ul role="list" className="mt-6 space-y-4">
                  {availableCoupons.map((coupon) => (
                    <li key={coupon._id} className="flex items-center">
                      <input
                        type="checkbox"
                        id={`coupon-${coupon._id}`}
                        checked={selectedCouponIds.includes(coupon._id ?? "")}
                        onChange={() => toggleCoupon(coupon._id ?? "")}
                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <label
                        htmlFor={`coupon-${coupon._id}`}
                        className="ml-3 block text-sm font-medium leading-6 text-gray-900"
                      >
                        ${coupon.discountAmount.toFixed(2)} off &mdash; expires{" "}
                        {dayjs(coupon.expiryDate).format("MMM D, YYYY h:mma")}
                      </label>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {isBookingValid() && (
              <>
                {hasDeliveryItem(products) && (
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

                  {hasDeliveryItem(products) && (
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

                  {(!sameAsShipping || !hasDeliveryItem(products)) && (
                    <>
                      <BillingForm />
                      {billingAddressError && (
                        <div className="mt-2 text-sm text-red-600">
                          Please fill in all required fields with a valid
                          address.
                        </div>
                      )}
                    </>
                  )}

                  <div className="mt-6 flex items-center">
                    <input
                      checked={termsAccepted}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setTermsModalOpen(true);
                        } else {
                          setTermsAccepted(false);
                        }
                      }}
                      id="terms-and-conditions"
                      name="terms-and-conditions"
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div className="ml-2">
                      <label
                        htmlFor="same-as-shipping"
                        className="text-sm font-medium text-gray-900"
                      >
                        I agree to the{" "}
                        <a
                          href={`${process.env.NEXT_PUBLIC_SERVER_URL}/policies`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-600 underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Dress for Less terms and conditions
                        </a>
                      </label>
                    </div>
                  </div>
                  {termsError && (
                    <div className="mt-2 text-sm text-red-600">
                      You must accept the terms and conditions to proceed.
                    </div>
                  )}
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
            {isFreeCheckout ? (
              <FreeCheckoutConfirmation
                address={userAddress}
                billingAddress={billingAddress}
                instructions={instructions}
              />
            ) : (
              clientSecret && (
                <Elements options={{ clientSecret }} stripe={stripePromise}>
                  <PaymentForm
                    clientSecret={clientSecret}
                    stripePromise={stripePromise}
                    isSubmitted={isSubmitted}
                    address={userAddress}
                    billingAddress={billingAddress}
                    instructions={instructions}
                  />
                </Elements>
              )
            )}
          </div>
        </section>
      )}
      <TermsModal
        isOpen={termsModalOpen}
        setOpen={setTermsModalOpen}
        onConfirm={() => setTermsAccepted(true)}
      />
    </>
  );
};

export default CheckoutForm;
