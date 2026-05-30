import { getAllBookingsByUserId } from "@/api/booking";
import { useUserContext } from "@/context/UserContext";
import React from "react";
import { OrderHistory } from "../../common/types";
import dayjs from "dayjs";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import Spinner from "@/components/Spinner";

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

const Orders = () => {
  const { userInfo } = useUserContext();
  const [previousOrders, setPreviousOrders] = React.useState<OrderHistory[]>(
    [],
  );
  const [upcomingOrders, setUpcomingOrders] = React.useState<OrderHistory[]>(
    [],
  );
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
  }, [status]);

  React.useEffect(() => {
    if (!userInfo?._id) return;

    setIsLoading(true);
    getAllBookingsByUserId(userInfo._id)
      .then((data) => {
        const userBookings = data.data as unknown as OrderHistory[];
        const today = dayjs().startOf("day");

        const upcoming = userBookings
          .filter((booking) => dayjs(booking.dateBooked).isAfter(today))
          .sort((a, b) => dayjs(a.dateBooked).diff(dayjs(b.dateBooked)));

        const previous = userBookings
          .filter(
            (booking) =>
              dayjs(booking.dateBooked).isBefore(today) ||
              dayjs(booking.dateBooked).isSame(today),
          )
          .sort((a, b) => dayjs(b.dateBooked).diff(dayjs(a.dateBooked)));

        setUpcomingOrders(upcoming);
        setPreviousOrders(previous);
      })
      .finally(() => setIsLoading(false));
  }, [userInfo]);

  const formatDate = (date: string) => {
    return dayjs(date).format("D MMMM YYYY");
  };

  const itemList = (orders: OrderHistory[]) => {
    return (
      <>
        <div className="mt-6 -mb-6 flow-root divide-y divide-gray-200 border-t border-gray-200">
          {orders.map((product) => (
            <div key={product._id} className="py-6 sm:flex">
              <div className="flex space-x-4 sm:min-w-0 sm:flex-1 sm:space-x-6 lg:space-x-8">
                <img
                  alt={product.dressImages}
                  src={product.dressImages}
                  className="size-20 flex-none rounded-md object-cover sm:size-48"
                />
                <div className="min-w-0 flex-1 pt-1.5 sm:pt-0">
                  <h3 className="text-sm font-medium text-gray-900">
                    <a href={`dresses/products/${product.dressId}`}>
                      {product.dressName}
                    </a>
                  </h3>
                  <p className="truncate text-sm text-gray-500">
                    <span>Booked for: {formatDate(product.dateBooked)}</span>{" "}
                    <span aria-hidden="true" className="mx-1 text-gray-400">
                      &middot;
                    </span>{" "}
                    <span>{product.size}</span>
                  </p>
                  <p className="mt-1 font-medium text-gray-900">
                    {product.price}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </>
    );
  };

  const displayedOrders =
    selectedTab === Selected.Upcoming ? upcomingOrders : previousOrders;

  return (
    <>
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
              Check the status of recent orders, manage returns, and discover
              similar products.
            </p>
          </div>

          <Tabs selected={selectedTab} onSelect={setSelectedTab} />
          {displayedOrders.length === 0 ? (
            <p className="mt-4 text-sm text-gray-500">
              No{" "}
              {selectedTab === Selected.Upcoming ? "upcoming" : "previous"}{" "}
              orders
            </p>
          ) : (
            itemList(displayedOrders)
          )}
        </main>
      )}
    </>
  );
};

export default Orders;
