import { CheckIcon, ClockIcon } from "@heroicons/react/20/solid";
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
  removeItem: (cartItemId: string) => void;
}

const CartItems = ({ products, removeItem }: ICartType) => {
  const router = useRouter();
  const { userInfo } = useUserContext();
  // const [products, setProducts] = React.useState<CartItemType[]>([]);

  // const getUserCart = React.useCallback(async () => {
  //   if (userInfo && userInfo?._id) {
  //     const response = await getCart(userInfo?._id);

  //     const cartItems = response.data as CartType[];
  //     let dresses: CartItemType[] = [];
  //     cartItems.forEach(async (item) => {
  //       await getDress(item.dressId).then((data) => {
  //         data.dateBooked = item.dateBooked;
  //         data.cartItemId = item._id;
  //         dresses = [...dresses, data];
  //       });

  //       setProducts(dresses);
  //     });
  //   }
  // }, [userInfo]);

  // React.useEffect(() => {
  //   getUserCart();
  // }, [getUserCart, userInfo]);

  const formatDate = (date: string) => {
    return dayjs(date).subtract(1, "day").format("D MMMM YYYY");
  };

  const sumPrices = () => {
    return products.reduce((n, { price }) => n + parseInt(price), 0).toFixed(2);
  };

  // const removeItem = async (cartItemId: string) => {
  //   await removeFromCart(cartItemId)
  //     .then((res) => getUserCart())
  //     .catch((err) => {
  //       console.log(err);
  //     });
  // };

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
          {products.map((product) => (
            <li key={product._id} className="flex py-6">
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
                  <p className="mt-1 text-sm text-gray-500">
                    Booked for: {formatDate(product.dateBooked)}
                  </p>
                </div>

                <div className="mt-4 flex flex-1 items-end justify-end">
                  <div className="ml-4">
                    <button
                      type="button"
                      className="text-sm font-medium text-secondary-pink hover:text-indigo-500"
                      onClick={() => removeItem(product.cartItemId)}
                    >
                      <span>Remove</span>
                    </button>
                  </div>
                </div>
              </div>
            </li>
          ))}
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
