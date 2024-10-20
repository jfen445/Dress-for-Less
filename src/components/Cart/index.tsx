import Button from "../Button";
import React from "react";
import { getCart, removeFromCart } from "@/api/cart";
import { useUserContext } from "@/context/UserContext";
import { CartItemType, CartType, DressType } from "../../../common/types";
import { getDress } from "../../../sanity/sanity.query";
import Link from "next/link";
import CartItems from "../CartItems";
import Spinner from "../Spinner";
import dayjs from "dayjs";

const Cart = () => {
  const { userInfo } = useUserContext();
  const [products, setProducts] = React.useState<CartItemType[]>([]);
  const [selectedProductIds, setSelectedProductIds] = React.useState<String[]>(
    []
  );
  const [err, setErr] = React.useState<boolean>(false);
  const [isLoading, setIsLoading] = React.useState<boolean>(false);

  const query = React.useCallback(() => {
    const params = new URLSearchParams();
    selectedProductIds.forEach((id) => params.append("id", id.toString()));
    return params;
  }, [selectedProductIds]);

  const getUserCart = React.useCallback(async () => {
    if (userInfo && userInfo?._id) {
      setIsLoading(true);
      await getCart(userInfo?._id)
        .then((data) => {
          const cartItems = data.data as unknown as CartType[];
          let dresses: CartItemType[] = [];
          cartItems.map(async (item) => {
            await getDress(item.dressId).then((data) => {
              data.dateBooked = item.dateBooked;
              data.cartItemId = item._id;
              data.size = item.size;
              dresses = [...dresses, data];
            });

            setProducts(dresses);
          });
        })
        .catch((err) => {
          setErr(true);
          console.log("error", err);
        })
        .finally(() => setIsLoading(false));
    }
  }, [userInfo]);

  React.useEffect(() => {
    getUserCart().catch((err) => setErr(true));
  }, [getUserCart, userInfo]);

  const removeItem = async (cartItemId: string) => {
    await removeFromCart(cartItemId)
      .then((res) => getUserCart())
      .catch((err) => {
        console.log(err);
      });
  };

  const isValidCheckout = () => {
    const selectedProducts = products.filter((item) =>
      selectedProductIds.includes(item.cartItemId)
    );

    const isDatesValid = selectedProducts.some((item) =>
      isInvalidDate(item.dateBooked)
    );

    const isEmpty = selectedProductIds.length == 0;

    return isDatesValid || isEmpty;
  };

  const isInvalidDate = (day: string | number | Date) => {
    const currentDate = dayjs(new Date());
    return dayjs(currentDate).isAfter(dayjs(new Date(day)));
  };

  return (
    <div className="bg-white min-h-screen">
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 sm:py-24 lg:px-0">
        <h1 className="text-center text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
          Shopping Cart
        </h1>
        {isLoading ? (
          <div className="flex justify-center mt-20">
            <Spinner />
          </div>
        ) : (
          <>
            {!err ? (
              <>
                <CartItems
                  products={products}
                  removeItem={removeItem}
                  selectedProducts={selectedProductIds}
                  setSelectedProducts={setSelectedProductIds}
                />

                <div className="mt-10 flex justify-center">
                  <Link
                    href={{ pathname: "/checkout", query: query().toString() }}
                  >
                    <Button
                      type="submit"
                      disabled={isValidCheckout()}
                      variant="secondary"
                    >
                      Checkout
                    </Button>
                  </Link>
                </div>
              </>
            ) : (
              <div className="w-full text-center my-10">
                <h3 className="text-sm font-medium text-yellow-800">
                  Your rental cart is empty
                </h3>
              </div>
            )}

            <div className="mt-6 text-center text-sm">
              <p>
                {!err ? "or " : ""}
                <a
                  href={"/dresses"}
                  className="font-medium text-secondary-pink hover:text-indigo-500"
                >
                  Continue Shopping
                  <span aria-hidden="true"> &rarr;</span>
                </a>
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Cart;
