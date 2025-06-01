import { getAllBookingsByUserId } from "@/api/booking";
import { useUserContext } from "@/context/UserContext";
import React from "react";
import { OrderHistory } from "../../common/types";
import dayjs from "dayjs";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";

const Orders = () => {
  const { userInfo } = useUserContext();
  const [orders, setOrders] = React.useState<OrderHistory[]>([]);
  const { status } = useSession();
  const router = useRouter();

  if (status === "unauthenticated") {
    router.push("/");
  }

  React.useEffect(() => {
    const fetchOrders = async () => {
      if (!userInfo || !userInfo._id) return;
      await getAllBookingsByUserId(userInfo._id).then((data) => {
        const userBookings = data.data as unknown as OrderHistory[]; // Adjust the type as needed

        setOrders(userBookings);
      });
    };

    fetchOrders();
  }, [userInfo]);

  const formatDate = (date: string) => {
    return dayjs(date).format("D MMMM YYYY");
  };

  return (
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

      <div className="mt-12 space-y-16 sm:mt-16">
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
              {/* <div className="mt-6 space-y-4 sm:mt-0 sm:ml-6 sm:w-40 sm:flex-none">
                <button
                  type="button"
                  className="flex w-full items-center justify-center rounded-md border border-transparent bg-indigo-600 px-2.5 py-2 text-sm font-medium text-white shadow-xs hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-hidden sm:w-full sm:grow-0"
                >
                  Buy again
                </button>
                <button
                  type="button"
                  className="flex w-full items-center justify-center rounded-md border border-gray-300 bg-white px-2.5 py-2 text-sm font-medium text-gray-700 shadow-xs hover:bg-gray-50 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-hidden sm:w-full sm:grow-0"
                >
                  Shop similar
                </button>
              </div> */}
            </div>
          ))}
        </div>
        {/* </section>
        ))} */}
      </div>
    </main>
  );
};

export default Orders;
