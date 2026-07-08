"use client";

import React from "react";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { useSession } from "next-auth/react";
import Link from "next/link";
import dayjs from "dayjs";
import TryOnCalendar from "./Calendar";
import SlotPicker from "./SlotPicker";
import TryOnPaymentForm from "./PaymentForm";
import Input from "@/components/Input";
import Button from "@/components/Button";
import Spinner from "@/components/Spinner";
import { getClientSecret } from "@/api/payment";
import { TRY_ON_FEE, formatTryOnTimeSlot } from "../../../common/constants/tryOn";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY!);

const TryOn = () => {
  const { data: session, status } = useSession();

  const [selectedDate, setSelectedDate] = React.useState("");
  const [selectedSlot, setSelectedSlot] = React.useState("");
  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [termsAccepted, setTermsAccepted] = React.useState(false);
  const [termsError, setTermsError] = React.useState(false);

  const [clientSecret, setClientSecret] = React.useState<string>();
  const [isPaymentStep, setIsPaymentStep] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isBooked, setIsBooked] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string>();

  const canContinue =
    selectedDate !== "" && selectedSlot !== "" && name.trim() !== "";

  const onContinueToPayment = async () => {
    if (!termsAccepted) {
      setTermsError(true);
      return;
    }
    setTermsError(false);
    setIsLoading(true);
    setErrorMessage(undefined);

    await getClientSecret((TRY_ON_FEE * 100).toString())
      .then((data) => {
        setClientSecret(data?.data.clientSecret);
        setIsPaymentStep(true);
      })
      .catch((err) => setErrorMessage(err.message))
      .finally(() => setIsLoading(false));
  };

  if (status === "loading") {
    return <Spinner />;
  }

  if (!session) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16 text-center">
        <h1 className="text-2xl font-bold text-gray-900">
          Book a Try-On Session
        </h1>
        <p className="mt-4 text-sm text-gray-600">
          Please sign in to book a try-on session.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-block rounded-md bg-primary-pink px-4 py-2.5 text-sm font-semibold text-white hover:bg-secondary-pink"
        >
          Sign in
        </Link>
      </div>
    );
  }

  if (isBooked) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16 text-center">
        <h1 className="text-2xl font-bold text-gray-900">
          Your try-on is booked!
        </h1>
        <p className="mt-4 text-sm text-gray-600">
          We&apos;ve sent a confirmation email with your session details and
          our terms and conditions. We can&apos;t wait to see you on{" "}
          {dayjs(selectedDate).format("dddd, MMMM D")} at{" "}
          {formatTryOnTimeSlot(selectedSlot)}.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-0">
      <h1 className="text-2xl font-bold text-gray-900">
        Book a Try-On Session
      </h1>
      <p className="mt-2 text-sm text-gray-600">
        Pick a date and time to come try on dresses in person. A ${TRY_ON_FEE}
        {" "}fee applies per session.
      </p>

      {!isPaymentStep ? (
        <>
          <TryOnCalendar setSelectedDate={setSelectedDate} />

          <SlotPicker
            date={selectedDate}
            selectedSlot={selectedSlot}
            setSelectedSlot={setSelectedSlot}
          />

          <div className="mt-8 space-y-4">
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-700"
              >
                Full name
              </label>
              <div className="mt-1">
                <Input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={name}
                  onChange={(e: any) => setName(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="phone"
                className="block text-sm font-medium text-gray-700"
              >
                Phone number
              </label>
              <div className="mt-1">
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={phone}
                  onChange={(e: any) => setPhone(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-start">
            <input
              checked={termsAccepted}
              onChange={() => setTermsAccepted(!termsAccepted)}
              id="try-on-terms"
              name="try-on-terms"
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <div className="ml-2">
              <label
                htmlFor="try-on-terms"
                className="text-sm font-medium text-gray-900"
              >
                I agree to the{" "}
                <Link
                  href="/policies"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-600 underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  Dress for Less terms and conditions
                </Link>
                , including the ${TRY_ON_FEE} non-refundable try-on fee.
              </label>
            </div>
          </div>
          {termsError && (
            <div className="mt-2 text-sm text-red-600">
              You must accept the terms and conditions to proceed.
            </div>
          )}

          {errorMessage && (
            <div className="mt-2 text-sm text-red-600">{errorMessage}</div>
          )}

          <div className="mt-8">
            <Button
              type="button"
              disabled={!canContinue || isLoading}
              onClick={onContinueToPayment}
              className="w-full"
            >
              {isLoading ? "Loading..." : "Continue to payment"}
            </Button>
          </div>
        </>
      ) : (
        <div className="mt-8">
          <h2 className="text-lg font-medium text-gray-900">
            Payment details
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {dayjs(selectedDate).format("dddd, MMMM D, YYYY")} at{" "}
            {formatTryOnTimeSlot(selectedSlot)} &mdash; ${TRY_ON_FEE}
          </p>
          <div className="mt-6">
            {clientSecret && (
              <Elements options={{ clientSecret }} stripe={stripePromise}>
                <TryOnPaymentForm
                  date={selectedDate}
                  timeSlot={selectedSlot}
                  name={name}
                  phone={phone}
                  onSuccess={() => setIsBooked(true)}
                />
              </Elements>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TryOn;
