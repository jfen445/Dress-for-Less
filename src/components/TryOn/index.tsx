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
import Button from "@/components/Button";
import Spinner from "@/components/Spinner";
import Modal from "@/components/Modal";
import { DialogTitle } from "@headlessui/react";
import { ExclamationCircleIcon } from "@heroicons/react/24/outline";
import { useUserContext } from "@/context/UserContext";
import { getClientSecret } from "@/api/payment";
import { TRY_ON_FEE, formatTryOnTimeSlot } from "../../../common/constants/tryOn";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY!);

const TryOn = () => {
  const { data: session, status } = useSession();
  const { userInfo } = useUserContext();

  const [selectedDate, setSelectedDate] = React.useState("");
  const [selectedSlot, setSelectedSlot] = React.useState("");
  const [termsAccepted, setTermsAccepted] = React.useState(false);
  const [termsError, setTermsError] = React.useState(false);

  const [clientSecret, setClientSecret] = React.useState<string>();
  const [isPaymentStep, setIsPaymentStep] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isBooked, setIsBooked] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string>();
  const [isProfileModalOpen, setIsProfileModalOpen] = React.useState(false);

  const isUserValid: boolean =
    userInfo?.name &&
    userInfo?.email &&
    userInfo.instagramHandle &&
    userInfo.mobileNumber
      ? true
      : false;

  const canContinue = selectedDate !== "" && selectedSlot !== "";

  const onContinueToPayment = async () => {
    if (!isUserValid) {
      setIsProfileModalOpen(true);
      return;
    }
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
      <Modal isOpen={isProfileModalOpen} setOpen={setIsProfileModalOpen}>
        <div>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <ExclamationCircleIcon
              aria-hidden="true"
              className="h-6 w-6 text-red-600"
            />
          </div>
          <div className="mt-3 text-center sm:mt-5">
            <DialogTitle
              as="h3"
              className="text-base font-semibold leading-6 text-gray-900"
            >
              Profile Incomplete
            </DialogTitle>
            <div className="mt-2">
              <p className="text-sm text-gray-500">
                To book a try-on, you must update your profile with your
                mobile number and Instagram handle.
              </p>
            </div>
          </div>
        </div>
        <div className="mt-5 sm:mt-6">
          <Link href={"/account"}>
            <Button
              type="button"
              onClick={() => setIsProfileModalOpen(false)}
              className="inline-flex w-full justify-center"
            >
              Go to Account Settings
            </Button>
          </Link>
        </div>
      </Modal>

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
            {clientSecret && userInfo && (
              <Elements options={{ clientSecret }} stripe={stripePromise}>
                <TryOnPaymentForm
                  date={selectedDate}
                  timeSlot={selectedSlot}
                  name={userInfo.name}
                  phone={userInfo.mobileNumber}
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
