import { ExclamationCircleIcon } from "@heroicons/react/20/solid";
import React from "react";
import { CartItemType } from "../../../common/types";
import dayjs from "dayjs";
import { useRouter } from "next/router";

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
  const router = useRouter();

  const navigateToDressProduct = (id: string) => {
    router.push(`/dresses/products/${id}`);
  };

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
    function groupByYearWeek(data: CartItemType[]) {
      return data.reduce(
        (acc: Record<number, Record<number, CartItemType[]>>, item) => {
          const d = new Date(item.dateBooked);
          const year = d.getFullYear();
          const week = getWeekNumber(d);
          acc[year] = acc[year] || {};
          acc[year][week] = acc[year][week] || [];
          acc[year][week].push(item);
          return acc;
        },
        {}
      );
    }

    const grouped = groupByYearWeek(products);

    // flatten to array of { year, week, items } and sort
    const groups = Object.entries(grouped).flatMap(([year, weeksObj]) =>
      Object.entries(weeksObj).map(([w, items]) => ({
        year: Number(year),
        week: Number(w),
        items,
      }))
    );

    // Sort: newest year first, then by week (adjust asc/desc as desired)
    groups.sort((a, b) =>
      a.year !== b.year ? b.year - a.year : a.week - b.week
    );

    return groups;
  }, [products]);

  const getWeekRange = (week: number, year: number) => {
    // ISO week 1 is the week with January 4th. Find Monday of week 1,
    // then add (week - 1) * 7 days to get the target week's Monday.
    const fourthJan = new Date(year, 0, 4);
    const dayOfWeek = fourthJan.getDay() || 7; // 1 (Mon) .. 7 (Sun)

    const isoWeek1Monday = new Date(fourthJan);
    isoWeek1Monday.setDate(fourthJan.getDate() - (dayOfWeek - 1));

    const weekMonday = new Date(isoWeek1Monday);
    weekMonday.setDate(isoWeek1Monday.getDate() + (week - 1) * 7);

    // Display Friday - Sunday of that ISO week
    const weekStartDate = new Date(weekMonday);
    weekStartDate.setDate(weekMonday.getDate() + 4); // Friday

    const weekEndDate = new Date(weekMonday);
    weekEndDate.setDate(weekMonday.getDate() + 6); // Sunday

    return {
      start: weekStartDate.toDateString(),
      end: weekEndDate.toDateString(),
    };
  };

  const formatDate = (date: string) => {
    return dayjs(date).format("dddd, D MMMM YYYY");
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
          {groupedByWeek().map(({ year, week, items }) => {
            const range = getWeekRange(week, year);
            return (
              <React.Fragment key={`${year}-${week}`}>
                <div className="bg-pink-100 flex px-2 items-center font-semibold">
                  <input
                    type="checkbox"
                    id="horns"
                    name="horns"
                    className="h-4 w-4 mr-4 rounded accent-secondary-pink"
                    checked={items
                      .map((d) => d.cartItemId)
                      .every((item) => selectedProducts.includes(item))}
                    onChange={(e) =>
                      handleCheckboxEvent(
                        e.target.checked,
                        items.map((d) => d.cartItemId),
                        items.map((d) => d.cartItemId)
                      )
                    }
                  />
                  {range.start} to {range.end}
                </div>

                {items.map((product) => (
                  <li key={product.cartItemId} className="flex py-6 px-2">
                    <div className="flex mr-4 ">
                      <input
                        type="checkbox"
                        id="horns"
                        name="horns"
                        className="h-4 w-4 rounded accent-secondary-pink"
                        checked={selectedProducts.includes(product.cartItemId)}
                        onChange={(e) =>
                          handleCheckboxEvent(
                            e.target.checked,
                            [product.cartItemId],
                            items.map((d) => d.cartItemId)
                          )
                        }
                      />
                    </div>

                    <div
                      className="flex-shrink-0 cursor-pointer"
                      onClick={() => navigateToDressProduct(product._id)}
                    >
                      <img
                        alt={product.images[0]}
                        src={product.images[0]}
                        className="h-24 w-24 rounded-md object-cover object-center sm:h-32 sm:w-32"
                      />
                    </div>

                    <div className="ml-4 flex flex-1 flex-col sm:ml-6 cursor-pointer">
                      <div>
                        <div className="flex justify-between">
                          <h4 className="text-sm">
                            <a
                              href={`/dresses/products/${product._id}`}
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
                ))}
              </React.Fragment>
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
