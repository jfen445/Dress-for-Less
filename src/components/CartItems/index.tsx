import {
  CheckIcon,
  ClockIcon,
  ExclamationCircleIcon,
} from "@heroicons/react/20/solid";
import Button from "../Button";
import React from "react";
import { getCart, removeFromCart } from "@/api/cart";
import { useUserContext } from "@/context/UserContext";
import { CartItemType, CartType, DressType } from "../../../common/types";
import { getDress } from "../../../sanity/sanity.query";
import dayjs from "dayjs";
import { useRouter } from "next/router";
import Link from "next/link";

interface ICartType {
  products: CartItemType[];
  selectedProducts: String[];
  setSelectedProducts: React.Dispatch<React.SetStateAction<String[]>>;
  removeItem: (cartItemId: CartItemType) => void;
}

const CartItems = ({
  products,
  removeItem,
  selectedProducts,
  setSelectedProducts,
}: ICartType) => {
  const getWeekNumber = (date: Date): number => {
    const copiedDate = new Date(date.getTime());

    // Set the day to Thursday of the current week to ensure correct ISO week calculation
    copiedDate.setUTCDate(
      copiedDate.getUTCDate() + 4 - (copiedDate.getUTCDay() || 7)
    );

    // Start of the year
    const yearStart = new Date(Date.UTC(copiedDate.getUTCFullYear(), 0, 1));

    // Calculate the full weeks to the current date
    const weekNo = Math.ceil(
      ((copiedDate.getTime() - yearStart.getTime()) / 86400000 + 1) / 7
    );
    return weekNo;
  };

  const groupedByWeek = React.useCallback(() => {
    // Function to group dresses by calendar week
    function groupByWeek(data: CartItemType[]): Record<number, CartItemType[]> {
      return data.reduce(
        (acc: Record<number, CartItemType[]>, item: CartItemType) => {
          const date = new Date(item.dateBooked);
          const week = getWeekNumber(date);

          // If the week key doesn't exist, create it
          if (!acc[week]) {
            acc[week] = [];
          }

          // Add the current item to the respective week
          acc[week].push(item);

          return acc;
        },
        {}
      );
    }

    return groupByWeek(products);
  }, [products]);

  const getWeekRange = (week: number, year: number) => {
    const firstDayOfYear = new Date(year, 0, 1);
    const daysOffset = (week - 1) * 7;
    const dayOfWeek = firstDayOfYear.getDay(); // 0 (Sunday) to 6 (Saturday)

    // Calculate the Monday of the first week (ISO week starts on Monday)
    const firstMonday = new Date(
      firstDayOfYear.setDate(
        firstDayOfYear.getDate() - dayOfWeek + (dayOfWeek === 0 ? 1 : 8)
      )
    );

    // Add the week offset
    const weekStartDate = new Date(
      firstMonday.setDate(firstMonday.getDate() + daysOffset)
    );
    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setDate(weekStartDate.getDate() + 6); // End of the week (Sunday)

    return {
      start: weekStartDate.toDateString(),
      end: weekEndDate.toDateString(),
    };
  };

  const formatDate = (date: string) => {
    return dayjs(date).format("D MMMM YYYY");
  };

  const sumPrices = () => {
    return products.reduce((n, { price }) => n + parseInt(price), 0).toFixed(2);
  };

  const handleCheckboxEvent = (
    selected: Boolean,
    id: String[],
    groupId: String[]
  ) => {
    if (selected) {
      const filteredArray = selectedProducts
        .filter((item) => groupId.includes(item))
        .concat(id);

      setSelectedProducts(filteredArray);
    } else {
      const filteredArray = selectedProducts.filter(
        (item) => !id.includes(item)
      );
      setSelectedProducts(filteredArray);
    }
  };

  const isInvalidDate = (day: string | number | Date) => {
    const currentDate = dayjs(new Date());
    return dayjs(currentDate).isAfter(dayjs(new Date(day)));
  };

  return (
    <form className="mt-12">
      <section aria-labelledby="cart-heading">
        <h2 id="cart-heading" className="sr-only">
          Items in your shopping cart
        </h2>

        <ul
          role="list"
          className="divide-y divide-gray-200 border-b border-t border-gray-200"
        >
          {Object.entries(groupedByWeek()).map(([week, dresses]) => {
            const range = getWeekRange(
              Number(week) - 1,
              new Date().getFullYear()
            );
            return (
              <>
                <div className="bg-pink-100 flex px-2 items-center font-semibold">
                  <input
                    type="checkbox"
                    id="horns"
                    name="horns"
                    className="h-4 w-4 mr-4 rounded accent-secondary-pink"
                    checked={dresses
                      .map((d) => d.cartItemId)
                      .every((item) => selectedProducts.includes(item))}
                    onChange={(e) =>
                      handleCheckboxEvent(
                        e.target.checked,
                        dresses.map((d) => d.cartItemId),
                        dresses.map((d) => d.cartItemId)
                      )
                    }
                  />
                  {range.start} to {range.end}
                </div>

                {dresses.map((product) => (
                  <>
                    <li key={product._id} className="flex py-6 px-2">
                      <div className="flex mr-4 ">
                        <input
                          type="checkbox"
                          id="horns"
                          name="horns"
                          className="h-4 w-4 rounded accent-secondary-pink"
                          checked={selectedProducts.includes(
                            product.cartItemId
                          )}
                          onChange={(e) =>
                            handleCheckboxEvent(
                              e.target.checked,
                              [product.cartItemId],
                              dresses.map((d) => d.cartItemId)
                            )
                          }
                        />
                      </div>

                      <div className="flex-shrink-0">
                        <img
                          alt={product.images[0]}
                          src={product.images[0]}
                          className="h-24 w-24 rounded-md object-cover object-center sm:h-32 sm:w-32"
                        />
                      </div>

                      <div className="ml-4 flex flex-1 flex-col sm:ml-6">
                        <div>
                          <div className="flex justify-between">
                            <h4 className="text-sm">
                              <a
                                href="#"
                                className="font-medium text-gray-700 hover:text-gray-800"
                              >
                                {product.name}
                              </a>
                            </h4>
                            <p className="ml-4 text-sm font-medium text-gray-900">
                              {product.price}
                            </p>
                          </div>

                          <p className="mt-1 text-sm text-gray-500">
                            Size: {product.size}
                          </p>
                          <div className="flex flex-row items-baseline">
                            <p className="mt-1 text-sm text-gray-500">
                              Booked for: {formatDate(product.dateBooked)}
                            </p>
                            {isInvalidDate(product.dateBooked) && (
                              <ExclamationCircleIcon className="size-4 text-red-500 ml-1" />
                            )}
                          </div>
                        </div>

                        <div className="mt-4 flex flex-1 items-end justify-end">
                          <div className="ml-4">
                            <button
                              type="button"
                              className="text-sm font-medium text-secondary-pink hover:text-indigo-500"
                              onClick={() => removeItem(product)}
                            >
                              <span>Remove</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </li>
                  </>
                ))}
              </>
            );
          })}
        </ul>
      </section>

      {/* Order summary */}
      <section aria-labelledby="summary-heading" className="mt-10">
        <h2 id="summary-heading" className="sr-only">
          Order summary
        </h2>

        <div>
          <dl className="space-y-4">
            <div className="flex items-center justify-between">
              <dt className="text-base font-medium text-gray-900">Subtotal</dt>
              <dd className="ml-4 text-base font-medium text-gray-900">
                ${sumPrices()}
              </dd>
            </div>
          </dl>
          <p className="mt-1 text-sm text-gray-500">
            Shipping and taxes will be calculated at checkout.
          </p>
        </div>
      </section>
    </form>
  );
};

export default CartItems;
