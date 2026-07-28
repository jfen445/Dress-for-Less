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
import TermsModal from "@/components/Checkout/TermsModal";
import { DialogTitle } from "@headlessui/react";
import { ExclamationCircleIcon } from "@heroicons/react/24/outline";
import { useUserContext } from "@/context/UserContext";
import { getClientSecret } from "@/api/payment";
import {
  TRY_ON_FEE,
  formatTryOnTimeSlot,
} from "../../../common/constants/tryOn";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY!);

const TRY_ON_INFO_SECTIONS: { title: string; items: string[] }[] = [
  {
    title: "Try-On Fee",
    items: [
      "A $15 try-on fee applies to all appointments.",
      "You will receive $10 credit towards a rental which must be used in 48 hours.",
      "Group try-ons are welcome - the try-on fee is charged per individual. Each person can book their own 30-minute slot. If booking multiple consecutive slots, you may attend at the same time (e.g. two 30-minute bookings allow two people to attend together for a 1-hour session).",
    ],
  },
  {
    title: "Presentation & Hygiene Requirements",
    items: [
      "To keep our garments in perfect condition for all customers, please ensure you:",
      "Arrive with no makeup, no fresh fake tan, and clean hands and body.",
      "Avoid using lotions, oils, heavy perfume or anything that may transfer onto garments.",
    ],
  },
  {
    title: "Garment Care During Try-On",
    items: [
      "Please handle all dresses gently and avoid forcing zips or trying on garments that clearly won’t fit.",
      "If any damage occurs (including makeup stains, tan transfer, rips, broken straps/zips), a damage fee may apply.",
      "No food or drinks are allowed inside the try-on area.",
    ],
  },
  {
    title: "Appointment Details",
    items: [
      "Please arrive on time. Late arrivals may result in a shorter session if another try-on is booked after you.",
      "Try-ons are half-hour slots for individuals only.",
      "You are welcome to bring one other person, but please be mindful of the space and the garments.",
      "Rental bookings take priority, therefore, we cannot guarantee that specific dresses may not be available to be tried on. If there are specific pieces you are wanting to try, please check in with us beforehand.",
    ],
  },
  {
    title: "Heels & Accessories",
    items: [
      "We have a small selection of heels available for you to pair with your dresses during your session.",
      "Please handle all heels and accessories with care.",
    ],
  },
  {
    title: "Photos & Videos",
    items: [
      "You are welcome to take photos/videos for personal reference.",
      "Try-ons are strictly for selecting a rental, not for photo shoots or content creation.",
    ],
  },
  {
    title: "Additional Notes",
    items: [
      "Try-on fees are non-refundable.",
      "Staff may provide size recommendations or request that you do not try on an item if it risks damage.",
    ],
  },
];

const TryOn = () => {
  const { data: session, status } = useSession();
  const { userInfo } = useUserContext();

  const [selectedDate, setSelectedDate] = React.useState("");
  const [selectedSlot, setSelectedSlot] = React.useState("");
  const [termsAccepted, setTermsAccepted] = React.useState(false);
  const [termsError, setTermsError] = React.useState(false);
  const [termsModalOpen, setTermsModalOpen] = React.useState(false);

  const [clientSecret, setClientSecret] = React.useState<string>();
  const [isPaymentStep, setIsPaymentStep] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isBooked, setIsBooked] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string>();
  const [isProfileModalOpen, setIsProfileModalOpen] = React.useState(false);
  const [isPolicyModalOpen, setIsPolicyModalOpen] = React.useState(false);

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
          We&apos;ve sent a confirmation email with your session details and our
          terms and conditions. We can&apos;t wait to see you on{" "}
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
                To book a try-on, you must update your profile with your mobile
                number and Instagram handle.
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

      <TermsModal
        isOpen={termsModalOpen}
        setOpen={setTermsModalOpen}
        onConfirm={() => {
          setTermsAccepted(true);
          setTermsError(false);
        }}
      />

      <h1 className="text-2xl font-bold text-gray-900">
        Book a Try-On Session
      </h1>
      <p className="mt-2 text-sm text-gray-600">
        Pick a date and time to try on dresses at our Albany location.
        Appointments are 30 minutes and cost ${TRY_ON_FEE} per person.
      </p>

      <Modal
        isOpen={isPolicyModalOpen}
        setOpen={setIsPolicyModalOpen}
        maxWidthClassName="sm:max-w-lg"
      >
        <DialogTitle
          as="h3"
          className="text-base font-semibold leading-6 text-gray-900"
        >
          Try-On Policy
        </DialogTitle>
        <div className="mt-4 max-h-[70vh] space-y-4 overflow-y-auto pr-1">
          {TRY_ON_INFO_SECTIONS.map(({ title, items }) => (
            <div key={title}>
              <h4 className="text-sm font-semibold text-gray-900">{title}</h4>
              <ul className="mt-1 list-disc space-y-1 pl-4 text-sm text-gray-600">
                {items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-5">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setIsPolicyModalOpen(false)}
            className="inline-flex w-full justify-center"
          >
            Close
          </Button>
        </div>
      </Modal>

      {!isPaymentStep ? (
        <>
          <TryOnCalendar setSelectedDate={setSelectedDate} />

          <SlotPicker
            date={selectedDate}
            selectedSlot={selectedSlot}
            setSelectedSlot={setSelectedSlot}
          />

          <div className="mt-6 space-y-4 rounded-md border border-gray-200 p-4">
            <h2 className="text-sm font-semibold text-gray-900">
              Before you book
            </h2>
            <div>
              <p className="text-sm font-medium text-gray-900">
                30-minute session
              </p>
              <p className="text-sm text-gray-600">
                Each appointment is for one person.
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">
                ${TRY_ON_FEE} non-refundable fee
              </p>
              <p className="text-sm text-gray-600">
                You’ll receive a $10 rental credit after your appointment, valid
                for 48 hours.
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">
                Come garment-ready
              </p>
              <p className="text-sm text-gray-600">
                Please arrive without makeup, fresh fake tan, lotions, oils or
                anything that may transfer onto the garments.
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">
                Looking for a specific dress?
              </p>
              <p className="text-sm text-gray-600">
                Rental bookings take priority, so availability for try-ons
                cannot be guaranteed. Message us before booking if there is a
                particular dress you would like to try.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsPolicyModalOpen(true)}
              className="text-sm font-medium text-secondary-pink hover:text-indigo-500"
            >
              + Read the full Try-On Policy
            </button>
          </div>

          <div className="mt-6 flex items-start">
            <input
              checked={termsAccepted}
              onChange={(e) => {
                if (e.target.checked) {
                  setTermsModalOpen(true);
                } else {
                  setTermsAccepted(false);
                }
              }}
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
                I agree to the Try-On policy and the{" "}
                <Link
                  href="/policies"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-600 underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  Dress for Less Terms and Conditions
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
          <h2 className="text-lg font-medium text-gray-900">Payment details</h2>
          <p className="mt-2 text-sm text-gray-600">
            {dayjs(selectedDate).format("dddd, MMMM D, YYYY")} at{" "}
            {formatTryOnTimeSlot(selectedSlot)} - ${TRY_ON_FEE}
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
