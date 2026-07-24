import { ExclamationCircleIcon } from "@heroicons/react/20/solid";
import React from "react";
import { CartItemType } from "../../../common/types";
import dayjs from "dayjs";
import { auckland } from "../../../lib/utils/timezone";
import { useRouter } from "next/router";
import Button from "../Button";

interface ICartType {
  products: CartItemType[];
  selectedProducts: string[];
  setSelectedProducts: React.Dispatch<React.SetStateAction<string[]>>;
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

  const groupedByDate = React.useCallback(() => {
    const grouped = products.reduce(
      (acc: Record<string, CartItemType[]>, item) => {
        const dateKey = auckland.format(item.dateBooked);
        acc[dateKey] = acc[dateKey] || [];
        acc[dateKey].push(item);
        return acc;
      },
      {},
    );

    const groups = Object.entries(grouped).map(([date, items]) => ({
      date,
      items,
    }));

    groups.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

    return groups;
  }, [products]);

  const formatDate = (date: string) => {
    return dayjs(date).format("dddd, D MMMM YYYY");
  };

  const sumPrices = () => {
    return products
      .filter((product) => selectedProducts.includes(product.cartItemId))
      .reduce((n, { price }) => n + parseInt(price), 0)
      .toFixed(2);
  };

  const handleCheckboxEvent = (
    selected: boolean,
    id: string[],
    groupId: string[],
  ) => {
    if (selected) {
      const filteredArray = selectedProducts
        .filter((item) => groupId.includes(item))
        .concat(id);

      setSelectedProducts(filteredArray);
    } else {
      const filteredArray = selectedProducts.filter(
        (item) => !id.includes(item),
      );
      setSelectedProducts(filteredArray);
    }
  };

  const isInvalidDate = (day: string | number | Date) => {
    return auckland.now().isAfter(auckland.toZone(day));
  };

  return (
    <form className="mt-12">
      <section aria-labelledby="cart-heading">
        <h2 id="cart-heading" className="sr-only">
          Items in your shopping cart
        </h2>
        <p className="mb-4 text-sm text-gray-500">
          Dresses below are grouped by the day they&apos;re booked for. You can
          only check out one day at a time - select items from a single date to
          continue.
        </p>

        <ul
          role="list"
          className="divide-y divide-gray-200 border-b border-t border-gray-200"
        >
          {groupedByDate().map(({ date, items }) => {
            return (
              <React.Fragment key={date}>
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
                        items.map((d) => d.cartItemId),
                      )
                    }
                  />
                  {formatDate(date)}
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
                            items.map((d) => d.cartItemId),
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
                        <p className="mt-1 text-sm text-gray-500">
                          {product.deliveryType}
                        </p>
                      </div>

                      <div className="mt-4 flex flex-1 items-end justify-end">
                        <div className="ml-4">
                          <Button
                            type="button"
                            variant="ghost"
                            className="text-sm font-medium text-secondary-pink hover:text-indigo-500"
                            onClick={() => removeItem(product)}
                          >
                            <span>Remove</span>
                          </Button>
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
