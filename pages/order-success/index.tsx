import React from "react";
import Stripe from "stripe";
import { useParams } from "next/navigation";
import { useRouter } from "next/router";
import { confirmBooking } from "@/api/booking";
import { Booking, BookingItem, DressType } from "../../common/types";
import { useUserContext } from "@/context/UserContext";
import Spinner from "@/components/Spinner";
import dayjs from "dayjs";
import { useGlobalContext } from "@/context/GlobalContext";
import { DeliveryType } from "../../common/enums/DeliveryType";
import { useCartContext } from "@/context/CartContext";
import { hasDeliveryItem, SHIPPING_FEE } from "../../lib/utils/deliveryRules";

const stripe = new Stripe(process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY as string);

type LineItem = { item: BookingItem; dress: DressType | null };

const OrderSuccess = ({
  searchParams,
}: {
  searchParams: { payment_intent: string };
}) => {
  const params = useParams<{ payment_intent: string }>();
  const router = useRouter();
  const { refreshCart } = useCartContext();
  const { getDressWithId } = useGlobalContext();
  const { userInfo } = useUserContext();
  const [booking, setBooking] = React.useState<Booking | null>(null);
  const [deliveryCost, setDeliveryCost] = React.useState<number>(0);
  const [lineItems, setLineItems] = React.useState<LineItem[]>([]);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);

  const subtotal = React.useMemo(
    () => booking?.items.reduce((sum, item) => sum + item.price, 0) ?? 0,
    [booking],
  );

  const paymentIntent = router.query.paymentIntent;

  React.useEffect(() => {
    const confirm = async () => {
      if (paymentIntent) {
        await confirmBooking(paymentIntent.toString())
          .then(async (data) => {
            const bookingData = data.data.booking as Booking;
            setBooking(bookingData);
            setDeliveryCost(
              hasDeliveryItem(bookingData.items) ? SHIPPING_FEE : 0,
            );
          })
          .catch((err) => {
            console.log(err);
            setIsLoading(false);
          });
      }
    };

    confirm();
  }, [params, router.query, router.query.payment_intent_client_secret, paymentIntent]);

  React.useEffect(() => {
    refreshCart();

    if (!booking || booking.items.length === 0) return;

    async function fetchDressDetails(items: BookingItem[]) {
      return Promise.all(
        items.map(async (item) => {
          try {
            return { item, dress: await getDressWithId(item.dressId) };
          } catch (error) {
            console.error(
              `Error fetching dress with ID ${item.dressId}:`,
              error,
            );
            return { item, dress: null };
          }
        }),
      );
    }

    fetchDressDetails(booking.items).then((results) => {
      setLineItems(results as unknown as LineItem[]);
      setIsLoading(false);
    });
  }, [booking, getDressWithId, refreshCart]);

  const firstItem = booking?.items[0];

  return (
    <>
      {isLoading ? (
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
                {"Booking submitted!"}
              </p>
              <p className="mt-2 text-base text-gray-500">
                A confirmation will be sent to your email shortly.
              </p>

              {/* <dl className="mt-12 text-sm font-medium">
                <dt className="text-gray-900">Tracking number</dt>
                <dd className="mt-2 text-indigo-600">51547878755545848512</dd>
              </dl> */}
            </div>

            <div className="mt-10 border-t border-gray-200">
              <h2 className="sr-only">Your order</h2>

              <h3 className="sr-only">Items</h3>
              {lineItems.map(({ item, dress }) => (
                <div
                  key={item._id ?? item.dressId}
                  className="flex space-x-6 border-b border-gray-200 py-10"
                >
                  <img
                    alt={dress?.images[0]}
                    src={dress?.images[0]}
                    className="h-20 w-20 flex-none rounded-lg bg-gray-100 object-cover object-center sm:h-40 sm:w-40"
                  />
                  <div className="flex flex-auto flex-col">
                    <div>
                      <h4 className="font-medium text-gray-900">
                        <a href={`/dresses?id=${dress?._id}`}>{dress?.name}</a>
                      </h4>
                      <p className="mt-2 text-sm text-gray-600">
                        {dress?.description}
                      </p>
                    </div>
                    <div className="mt-6 flex flex-1 items-end">
                      <dl className="flex space-x-4 divide-x divide-gray-200 text-sm sm:space-x-6">
                        <div className="flex">
                          <dt className="font-medium text-gray-900">Size</dt>
                          <dd className="ml-2 text-gray-700">{item.size}</dd>
                        </div>
                        <div className="flex pl-4 sm:pl-6">
                          <dt className="font-medium text-gray-900">Price</dt>
                          <dd className="ml-2 text-gray-700">{dress?.price}</dd>
                        </div>
                        <div className="flex pl-4 sm:pl-6">
                          <dt className="font-medium text-gray-900">
                            Date booked
                          </dt>
                          <dd className="ml-2 text-gray-700">
                            {dayjs(item.dateBooked).format("DD/MM/YYYY")}
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
                  {hasDeliveryItem(booking?.items ?? []) &&
                    firstItem?.address && (
                      <div>
                        <dt className="font-medium text-gray-900">
                          Shipping address
                        </dt>
                        <dd className="mt-2 text-gray-700">
                          <address className="not-italic">
                            <span className="block">{userInfo?.name}</span>
                            {firstItem.address.company && (
                              <span className="block">
                                {firstItem.address.company}
                              </span>
                            )}
                            <span className="block">
                              {firstItem.address.apartment
                                ? `${firstItem.address.apartment}/${firstItem.address.address}`
                                : firstItem.address.address}
                            </span>
                            <span className="block">
                              {[
                                firstItem.address.suburb,
                                firstItem.address.city,
                                firstItem.address.postCode,
                              ]
                                .filter(Boolean)
                                .join(" ")}
                            </span>
                            <span className="block">
                              {firstItem.address.country}
                            </span>
                          </address>
                        </dd>
                      </div>
                    )}
                  <div>
                    <dt className="font-medium text-gray-900">
                      Billing address
                    </dt>
                    <dd className="mt-2 text-gray-700">
                      <address className="not-italic">
                        <span className="block">{userInfo?.name}</span>
                        {booking?.billingAddress.company && (
                          <span className="block">
                            {booking.billingAddress.company}
                          </span>
                        )}
                        <span className="block">
                          {booking?.billingAddress.apartment
                            ? `${booking.billingAddress.apartment}/${booking.billingAddress.address}`
                            : booking?.billingAddress.address}
                        </span>
                        <span className="block">
                          {[
                            booking?.billingAddress.suburb,
                            booking?.billingAddress.city,
                            booking?.billingAddress.postCode,
                          ]
                            .filter(Boolean)
                            .join(" ")}
                        </span>
                        <span className="block">
                          {booking?.billingAddress.country}
                        </span>
                      </address>
                    </dd>
                  </div>
                </dl>

                {firstItem?.instructions && (
                  <dl className="border-t border-gray-200 py-10 text-sm">
                    <div>
                      <dt className="font-medium text-gray-900">
                        Delivery instructions
                      </dt>
                      <dd className="mt-2 text-gray-700">
                        {firstItem.instructions}
                      </dd>
                    </div>
                  </dl>
                )}

                <h4 className="sr-only">Payment</h4>
                <dl className="grid grid-cols-2 gap-x-6 border-t border-gray-200 py-10 text-sm">
                  <div>
                    <dt className="font-medium text-gray-900">
                      Shipping method
                    </dt>
                    <dd className="mt-2 text-gray-700">
                      <p>{firstItem?.deliveryType}</p>
                    </dd>
                  </div>
                </dl>

                <h3 className="sr-only">Summary</h3>

                <dl className="space-y-6 border-t border-gray-200 pt-10 text-sm">
                  <div className="flex justify-between">
                    <dt className="font-medium text-gray-900">Subtotal</dt>
                    <dd className="text-gray-700">${subtotal}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="font-medium text-gray-900">Shipping</dt>
                    <dd className="text-gray-700">${deliveryCost}</dd>
                  </div>
                  {(booking?.discountAmount ?? 0) > 0 && (
                    <div className="flex justify-between">
                      <dt className="font-medium text-gray-900">
                        Coupon discount
                      </dt>
                      <dd className="text-gray-700">
                        -${(booking?.discountAmount ?? 0).toFixed(2)}
                      </dd>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <dt className="font-medium text-gray-900">Total</dt>
                    <dd className="text-gray-900">
                      $
                      {Math.max(
                        0,
                        subtotal + deliveryCost - (booking?.discountAmount ?? 0),
                      )}
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
