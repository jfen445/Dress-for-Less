import React from "react";
import {
  Popover,
  PopoverBackdrop,
  PopoverButton,
  PopoverPanel,
} from "@headlessui/react";
import { ChevronUpIcon } from "@heroicons/react/20/solid";
import { useUserContext } from "@/context/UserContext";
import { CartItemType, CartType } from "../../../../common/types";
import { getCart } from "@/api/cart";
import { getDress } from "../../../../sanity/sanity.query";
import dayjs from "dayjs";
import { ProductContext } from "..";

const OrderSummary = () => {
  const { userInfo } = useUserContext();
  const { products, setProducts, deliveryOption, setTotalPrice } =
    React.useContext(ProductContext);

  const shippingCost = React.useCallback(() => {
    if (deliveryOption === "delivery") {
      return "15.00";
    }

    if (
      deliveryOption === "pickup/delivery" ||
      deliveryOption === "delivery/pickup"
    ) {
      return "7.00";
    }

    return "0.00";
  }, [deliveryOption]);

  React.useEffect(() => {
    const getUserCart = async () => {
      if (userInfo && userInfo?._id) {
        const response = await getCart(userInfo?._id)
          .then((data) => {
            const cartItems = data.data as unknown as CartType[];
            let dresses: CartItemType[] = [];
            cartItems.forEach(async (item) => {
              await getDress(item.dressId).then((data) => {
                data.dateBooked = item.dateBooked;
                data.cartItemId = item._id;
                data.size = item.size;
                dresses = [...dresses, data];
              });

              setProducts(dresses);
            });
          })
          .catch((err) => console.error(err));
      }
    };

    getUserCart();
  }, [setProducts, userInfo]);

  const formatDate = (date: string) => {
    return dayjs(date).format("D MMMM YYYY");
  };

  const sumPrices = (): string => {
    return products.reduce((n, { price }) => n + parseInt(price), 0).toFixed(2);
  };

  const sumTotalPrices = () => {
    setTotalPrice((parseInt(sumPrices()) + parseInt(shippingCost())) * 100);
    return (parseInt(sumPrices()) + parseInt(shippingCost())).toFixed(2);
  };

  return (
    <>
      <section
        aria-labelledby="summary-heading"
        className="bg-gray-50 px-4 pb-10 pt-16 sm:px-6 lg:col-start-2 lg:row-start-1 lg:bg-transparent lg:px-0 lg:pb-16"
      >
        <div className="mx-auto max-w-lg lg:max-w-none">
          <h2
            id="summary-heading"
            className="text-lg font-medium text-gray-900"
          >
            Order summary
          </h2>

          <ul
            role="list"
            className="divide-y divide-gray-200 text-sm font-medium text-gray-900"
          >
            {products.map((product) => (
              <li key={product._id} className="flex items-start space-x-4 py-6">
                <img
                  alt={product.images[0]}
                  src={product.images[0]}
                  className="h-20 w-20 flex-none rounded-md object-cover object-center"
                />
                <div className="flex-auto space-y-1">
                  <h3>{product.name}</h3>
                  <p className="text-gray-500">{product.size}</p>
                  <p className="text-gray-500">
                    {formatDate(product.dateBooked)}
                  </p>
                </div>
                <p className="flex-none text-base font-medium">
                  {product.price}
                </p>
              </li>
            ))}
          </ul>

          <dl className="hidden space-y-6 border-t border-gray-200 pt-6 text-sm font-medium text-gray-900 lg:block">
            <div className="flex items-center justify-between">
              <dt className="text-gray-600">Subtotal</dt>
              <dd>${sumPrices()}</dd>
            </div>

            <div className="flex items-center justify-between">
              <dt className="text-gray-600">Shipping</dt>
              <dd>${shippingCost()}</dd>
            </div>

            <div className="flex items-center justify-between border-t border-gray-200 pt-6">
              <dt className="text-base">Total</dt>
              <dd className="text-base">${sumTotalPrices()}</dd>
            </div>
          </dl>

          <Popover className="fixed inset-x-0 bottom-0 flex flex-col-reverse text-sm font-medium text-gray-900 lg:hidden">
            <div className="relative z-10 border-t border-gray-200 bg-white px-4 sm:px-6">
              <div className="mx-auto max-w-lg">
                <PopoverButton className="flex w-full items-center py-6 font-medium">
                  <span className="mr-auto text-base">Total</span>
                  <span className="mr-2 text-base">${sumTotalPrices()}</span>
                  <ChevronUpIcon
                    aria-hidden="true"
                    className="h-5 w-5 text-gray-500"
                  />
                </PopoverButton>
              </div>
            </div>

            <PopoverBackdrop
              transition
              className="fixed inset-0 bg-black bg-opacity-25 transition-opacity duration-300 ease-linear data-[closed]:opacity-0"
            />

            <PopoverPanel
              transition
              className="relative transform bg-white px-4 py-6 transition duration-300 ease-in-out data-[closed]:translate-y-full sm:px-6"
            >
              <dl className="mx-auto max-w-lg space-y-6">
                <div className="flex items-center justify-between">
                  <dt className="text-gray-600">Subtotal</dt>
                  <dd>${sumPrices()}</dd>
                </div>

                <div className="flex items-center justify-between">
                  <dt className="text-gray-600">Shipping</dt>
                  <dd>${shippingCost()}</dd>
                </div>
              </dl>
            </PopoverPanel>
          </Popover>
        </div>
      </section>
    </>
  );
};

export default OrderSummary;
