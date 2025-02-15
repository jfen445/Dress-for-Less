import React from "react";
import Stripe from "stripe";
import { useParams, useSearchParams } from "next/navigation";
import { useRouter } from "next/router";
import { confirmBooking } from "@/api/booking";
import { Booking, DressType } from "../../common/types";
import { getDress } from "../../sanity/sanity.query";
import dress from "../../common/schemas/dress";
import { useUserContext } from "@/context/UserContext";
import Spinner from "@/components/Spinner";
import dayjs from "dayjs";
import { useGlobalContext } from "@/context/GlobalContext";

const deliveryMethods = [
  { id: "delivery", title: "Full delivery" },
  { id: "pickup", title: "Full pick up" },
  { id: "pickup/delivery", title: "Pick up and delivery return" },
  { id: "delivery/pickup", title: "Delivery and drop off" },
];

const stripe = new Stripe(process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY as string);

const OrderSuccess = ({
  searchParams,
}: {
  searchParams: { payment_intent: string };
}) => {
  const params = useParams<{ payment_intent: string }>();
  const router = useRouter();
  const { getDressWithId } = useGlobalContext();
  const { userInfo } = useUserContext();
  const [bookings, setBookings] = React.useState<Booking[]>([]);
  const [deliveryCost, setDeliveryCost] = React.useState<number>(0);
  const [bookingDresses, setBookingDresses] = React.useState<DressType[]>([]);
  const price = React.useCallback(() => {
    const totalPrice = bookings.reduce(
      (partialSum, { price }) => partialSum + price,
      0
    );

    return Number(totalPrice).toString();
  }, [bookings]);

  const deliveryType = React.useCallback(() => {
    if (bookings.length == 0) return "";
    return bookings[0].deliveryType;
    // return String(delivery).charAt(0).toUpperCase() + String(delivery).slice(1);
  }, [bookings]);

  const shippingCost = () => {
    const type = deliveryType();
  };

  React.useEffect(() => {
    const confirm = async () => {
      if (router.query.payment_intent_client_secret) {
        await confirmBooking(
          router.query.payment_intent_client_secret.toString()
        )
          .then(async (data) => {
            const bookingData = data.data.booking as Booking[];
            setBookings(bookingData);

            console.log("hello", data);
            const deliveryStatus = bookingData[0].deliveryType;

            if (deliveryStatus == "delivery") {
              setDeliveryCost(15);
            } else if (deliveryStatus == "pickup") {
              setDeliveryCost(0);
            } else {
              setDeliveryCost(7.5);
            }
          })
          .catch((err) => console.log(err));
      }
    };

    confirm();
  }, [params, router.query, router.query.payment_intent_client_secret]);

  React.useEffect(() => {
    async function fetchDressDetails(bookings: Booking[]) {
      const dressDetails = await Promise.all(
        bookings.map(async (booking) => {
          try {
            return getDressWithId(booking.dressId);
          } catch (error) {
            console.error(
              `Error fetching dress with ID ${booking.dressId}:`,
              error
            );
            return null; // Handle errors gracefully
          }
        })
      );

      return dressDetails.filter((detail) => detail !== null); // Remove null values if any
    }

    fetchDressDetails(bookings).then((results) => {
      setBookingDresses(results as unknown as DressType[]);
    });
  }, [bookings, getDressWithId]);

  function getDeliveryMethodTitle() {
    const method = deliveryMethods.find(
      (method) => method.id === deliveryType()
    );

    return method ? method.title : null; // Return title if found, otherwise null
  }

  function addStringNumbers(num1: string, num2: number) {
    // Convert strings to numbers
    const number1 = parseFloat(num1);
    const number2 = num2;

    // Check if conversion is successful
    if (isNaN(number1) || isNaN(number2)) {
      throw new Error(
        "Invalid input: Both inputs must be valid numbers as strings."
      );
    }

    // Perform the addition
    return number1 + number2;
  }

  return (
    <>
      {!bookings ? (
        <div className="h-screen flex items-center justify-center">
          <Spinner />
        </div>
      ) : (
        <div className="bg-white">
          <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
            <div className="max-w-xl">
              <h1 className="text-base font-medium text-secondary-pink">
                Thank you!
              </h1>
              <p className="mt-2 text-4xl font-bold tracking-tight sm:text-5xl">
                {"It's on the way!"}
              </p>
              <p className="mt-2 text-base text-gray-500">
                Your order will be with you soon.
              </p>

              {/* <dl className="mt-12 text-sm font-medium">
                <dt className="text-gray-900">Tracking number</dt>
                <dd className="mt-2 text-indigo-600">51547878755545848512</dd>
              </dl> */}
            </div>

            <div className="mt-10 border-t border-gray-200">
              <h2 className="sr-only">Your order</h2>

              <h3 className="sr-only">Items</h3>
              {bookingDresses.map((dress, index) => (
                <div
                  key={dress._id}
                  className="flex space-x-6 border-b border-gray-200 py-10"
                >
                  <img
                    alt={dress.images[0]}
                    src={dress.images[0]}
                    className="h-20 w-20 flex-none rounded-lg bg-gray-100 object-cover object-center sm:h-40 sm:w-40"
                  />
                  <div className="flex flex-auto flex-col">
                    <div>
                      <h4 className="font-medium text-gray-900">
                        <a href={`/dresses?id=${dress._id}`}>{dress.name}</a>
                      </h4>
                      <p className="mt-2 text-sm text-gray-600">
                        {dress.description}
                      </p>
                    </div>
                    <div className="mt-6 flex flex-1 items-end">
                      <dl className="flex space-x-4 divide-x divide-gray-200 text-sm sm:space-x-6">
                        <div className="flex">
                          <dt className="font-medium text-gray-900">Size</dt>
                          <dd className="ml-2 text-gray-700">
                            {bookings[index].size}
                          </dd>
                        </div>
                        <div className="flex pl-4 sm:pl-6">
                          <dt className="font-medium text-gray-900">Price</dt>
                          <dd className="ml-2 text-gray-700">{dress.price}</dd>
                        </div>
                        <div className="flex pl-4 sm:pl-6">
                          <dt className="font-medium text-gray-900">
                            Date booked
                          </dt>
                          <dd className="ml-2 text-gray-700">
                            {dayjs(bookings[index].dateBooked).format(
                              "DD/MM/YYYY"
                            )}
                          </dd>
                        </div>
                      </dl>
                    </div>
                  </div>
                </div>
              ))}

              <div className="sm:ml-40 sm:pl-6">
                <h3 className="sr-only">Your information</h3>

                <h4 className="sr-only">Addresses</h4>
                <dl className="grid grid-cols-2 gap-x-6 py-10 text-sm">
                  <div>
                    <dt className="font-medium text-gray-900">
                      Shipping address
                    </dt>
                    <dd className="mt-2 text-gray-700">
                      <address className="not-italic">
                        <span className="block">{userInfo?.name}</span>
                        <span className="block">{bookings[0]?.address}</span>
                      </address>
                    </dd>
                  </div>
                  <div>
                    <dt className="font-medium text-gray-900">
                      Billing address
                    </dt>
                    <dd className="mt-2 text-gray-700">
                      <address className="not-italic">
                        <span className="block">{userInfo?.name}</span>
                        <span className="block">{bookings[0]?.address}</span>
                      </address>
                    </dd>
                  </div>
                </dl>

                <h4 className="sr-only">Payment</h4>
                <dl className="grid grid-cols-2 gap-x-6 border-t border-gray-200 py-10 text-sm">
                  <div>
                    <dt className="font-medium text-gray-900">
                      Shipping method
                    </dt>
                    <dd className="mt-2 text-gray-700">
                      <p>{getDeliveryMethodTitle()}</p>
                    </dd>
                  </div>
                </dl>

                <h3 className="sr-only">Summary</h3>

                <dl className="space-y-6 border-t border-gray-200 pt-10 text-sm">
                  <div className="flex justify-between">
                    <dt className="font-medium text-gray-900">Subtotal</dt>
                    <dd className="text-gray-700">${price()}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="font-medium text-gray-900">Shipping</dt>
                    <dd className="text-gray-700">${deliveryCost}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="font-medium text-gray-900">Total</dt>
                    <dd className="text-gray-900">
                      ${addStringNumbers(price(), deliveryCost)}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default OrderSuccess;
