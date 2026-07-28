import { getAllBookingsByUserId } from "@/api/booking";
import { useUserContext } from "@/context/UserContext";
import React from "react";
import { Booking, BookingItem } from "../../common/types";
import dayjs from "dayjs";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import Spinner from "@/components/Spinner";
import Seo from "@/components/Seo";
import { DeliveryType } from "../../common/enums/DeliveryType";

enum Selected {
  Previous,
  Upcoming,
}

const Tabs = ({
  selected,
  onSelect,
}: {
  selected: Selected;
  onSelect: (s: Selected) => void;
}) => {
  return (
    <div className="mt-12 flex flex-col space-y-4 sm:mt-16 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-4">
      <h1
        className={`cursor-pointer text-xl font-bold tracking-tight ${
          selected === Selected.Upcoming ? "text-gray-900" : "text-gray-200"
        }`}
        onClick={() => onSelect(Selected.Upcoming)}
      >
        Upcoming orders
      </h1>

      <h1 className="hidden text-xl font-bold tracking-tight text-gray-400 sm:block">
        |
      </h1>

      <h1
        className={`cursor-pointer text-xl font-bold tracking-tight ${
          selected === Selected.Previous ? "text-gray-900" : "text-gray-200"
        }`}
        onClick={() => onSelect(Selected.Previous)}
      >
        Previous orders
      </h1>
    </div>
  );
};

const formatDate = (date: string) => dayjs(date).format("D MMMM YYYY");

const OrderItemRow = ({ item }: { item: BookingItem }) => (
  <div className="flex space-x-4 py-6 first:pt-0 last:pb-0 sm:space-x-6 lg:space-x-8">
    <img
      alt={item.dress?.name ?? ""}
      src={item.dress?.images?.[0]}
      className="size-20 flex-none rounded-md object-cover sm:size-40"
    />
    <div className="min-w-0 flex-1 pt-1.5 sm:pt-0">
      <h3 className="text-sm font-medium text-gray-900">
        <a href={`/dresses/products/${item.dressId}`}>{item.dress?.name}</a>
      </h3>
      {item.dress?.brand && (
        <p className="text-sm text-gray-500">{item.dress.brand}</p>
      )}
      <p className="truncate text-sm text-gray-500">
        <span>Booked for: {formatDate(item.dateBooked)}</span>{" "}
        <span aria-hidden="true" className="mx-1 text-gray-400">
          &middot;
        </span>{" "}
        <span>Size {item.size}</span>
      </p>
      <p className="mt-1 font-medium text-gray-900">${item.price}</p>
      <p className="mt-1 text-sm text-gray-500">{item.deliveryType}</p>
      {item.deliveryType !== DeliveryType.Pickup && item.address && (
        <address className="mt-1 not-italic text-sm text-gray-500">
          {item.address.apartment
            ? `${item.address.apartment}/${item.address.address}`
            : item.address.address}
          {", "}
          {[item.address.suburb, item.address.city, item.address.postCode]
            .filter(Boolean)
            .join(" ")}
        </address>
      )}
      {item.instructions && (
        <p className="mt-1 text-sm text-gray-500">
          Instructions: {item.instructions}
        </p>
      )}
    </div>
  </div>
);

const OrderCard = ({ order }: { order: Booking }) => (
  <div className="py-6">
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
      <div>
        {order.orderNumber && (
          <p className="pb-2 text-sm font-medium text-secondary-pink">
            {order.orderNumber}
          </p>
        )}
        {order.tracking && (
          <p className="text-sm text-gray-500">Tracking: {order.tracking}</p>
        )}
      </div>
      <p className="text-sm font-medium text-gray-900">
        Total: ${order.totalPrice}
      </p>
    </div>
    <div className="divide-y divide-gray-100">
      {order.items.map((item, index) => (
        <OrderItemRow key={item._id ?? index} item={item} />
      ))}
    </div>
  </div>
);

const Orders = () => {
  const { userInfo } = useUserContext();
  const [previousOrders, setPreviousOrders] = React.useState<Booking[]>([]);
  const [upcomingOrders, setUpcomingOrders] = React.useState<Booking[]>([]);
  const { status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState(true);
  const [selectedTab, setSelectedTab] = React.useState<Selected>(
    Selected.Upcoming,
  );

  React.useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);

  React.useEffect(() => {
    if (!userInfo?._id) return;

    setIsLoading(true);
    getAllBookingsByUserId(userInfo._id)
      .then((data) => {
        const orders = data.data as unknown as Booking[];
        const today = dayjs().startOf("day");
        // The first item's date decides which tab an order belongs in and
        // how it's sorted, matching how the admin bookings view treats it
        // as the order's primary date.
        const primaryDate = (order: Booking) =>
          dayjs(order.items[0]?.dateBooked);

        const upcoming = orders
          .filter((order) => primaryDate(order).isAfter(today))
          .sort((a, b) => primaryDate(a).diff(primaryDate(b)));

        const previous = orders
          .filter((order) => !primaryDate(order).isAfter(today))
          .sort((a, b) => primaryDate(b).diff(primaryDate(a)));

        setUpcomingOrders(upcoming);
        setPreviousOrders(previous);
      })
      .finally(() => setIsLoading(false));
  }, [userInfo]);

  const displayedOrders =
    selectedTab === Selected.Upcoming ? upcomingOrders : previousOrders;

  return (
    <>
      <Seo
        title="Order History | Dress for Less"
        description="View your past and upcoming Dress for Less orders."
        path="/order-history"
        noindex
      />
      {isLoading ? (
        <div className="flex items-center justify-center min-h-screen">
          <Spinner />
        </div>
      ) : (
        <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:pt-24 sm:pb-32 lg:px-8">
          <div className="max-w-xl">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
              Your Orders
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              View the details of your recent orders.
            </p>
          </div>

          <Tabs selected={selectedTab} onSelect={setSelectedTab} />
          {displayedOrders.length === 0 ? (
            <p className="mt-4 text-sm text-gray-500">
              No {selectedTab === Selected.Upcoming ? "upcoming" : "previous"}{" "}
              orders
            </p>
          ) : (
            <div className="mt-6 -mb-6 divide-y divide-gray-200 border-t border-gray-200">
              {displayedOrders.map((order) => (
                <OrderCard key={order._id} order={order} />
              ))}
            </div>
          )}
        </main>
      )}
    </>
  );
};

export default Orders;
