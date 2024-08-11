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
import CartItems from "../CartItems";

const Cart = () => {
  const router = useRouter();
  const { userInfo } = useUserContext();
  const [products, setProducts] = React.useState<CartItemType[]>([]);

  const getUserCart = async () => {
    if (userInfo && userInfo?._id) {
      const response = await getCart(userInfo?._id);

      const cartItems = response.data as CartType[];
      let dresses: CartItemType[] = [];
      cartItems.forEach(async (item) => {
        await getDress(item.dressId).then((data) => {
          data.dateBooked = item.dateBooked;
          data.cartItemId = item._id;
          dresses = [...dresses, data];
        });

        setProducts(dresses);
      });
    }
  };

  React.useEffect(() => {
    getUserCart();
  }, [userInfo]);

  const formatDate = (date: string) => {
    return dayjs(date).subtract(1, "day").format("D MMMM YYYY");
  };

  const sumPrices = () => {
    return products.reduce((n, { price }) => n + parseInt(price), 0).toFixed(2);
  };

  const removeItem = async (cartItemId: string) => {
    await removeFromCart(cartItemId)
      .then((res) => getUserCart())
      .catch((err) => {
        console.log(err);
      });
  };

  return (
    <div className="bg-white">
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 sm:py-24 lg:px-0">
        <h1 className="text-center text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
          Shopping Cart
        </h1>

        <CartItems />

        <div className="mt-10">
          <Link href={"/checkout"}>
            <Button
              type="submit"
              className="w-full rounded-md border border-transparent bg-indigo-600 px-4 py-3 text-base font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-50"
            >
              Checkout
            </Button>
          </Link>
        </div>

        <div className="mt-6 text-center text-sm">
          <p>
            or{" "}
            <a
              href={"/dresses"}
              className="font-medium text-secondary-pink hover:text-indigo-500"
            >
              Continue Shopping
              <span aria-hidden="true"> &rarr;</span>
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Cart;
