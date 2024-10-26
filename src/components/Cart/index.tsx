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
import Modal from "../Modal";
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import { ExclamationCircleIcon } from "@heroicons/react/24/outline";

const Cart = () => {
  const { userInfo } = useUserContext();
  const [products, setProducts] = React.useState<CartItemType[]>([]);
  const [selectedProductIds, setSelectedProductIds] = React.useState<String[]>(
    []
  );
  const [err, setErr] = React.useState<boolean>(false);
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [isOpen, setIsOpen] = React.useState<boolean>(false);

  console.log("user", userInfo);

  const isUserValid: boolean =
    userInfo?.email &&
    userInfo.instagramHandle &&
    userInfo.mobileNumber &&
    userInfo.photo
      ? true
      : false;

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
    <>
      <Modal isOpen={isOpen} setOpen={setIsOpen}>
        <div>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <ExclamationCircleIcon
              aria-hidden="true"
              className="h-6 w-6 text-red-600"
            />
          </div>
          <div className="mt-3 text-center sm:mt-5">
            <DialogTitle
              as="h3"
              className="text-base font-semibold leading-6 text-gray-900"
            >
              Profile Incomplete
            </DialogTitle>
            <div className="mt-2">
              <p className="text-sm text-gray-500">
                To checkout, you must update your profile with your mobile
                number and ID photo
              </p>
            </div>
          </div>
        </div>
        <div className="mt-5 sm:mt-6">
          <Link href={"/account"}>
            <Button
              type="button"
              onClick={() => setIsOpen(false)}
              className="inline-flex w-full justify-center"
            >
              Go to Account Settings
            </Button>
          </Link>
        </div>
      </Modal>
      <div className="bg-white">
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
                    {isUserValid ? (
                      <Link
                        href={{
                          pathname: "/checkout",
                          query: query().toString(),
                        }}
                      >
                        <Button
                          type="submit"
                          disabled={isValidCheckout()}
                          variant="secondary"
                        >
                          Checkout
                        </Button>
                      </Link>
                    ) : (
                      <Button
                        type="submit"
                        disabled={isValidCheckout()}
                        variant="secondary"
                        onClick={() => setIsOpen(true)}
                      >
                        Checkout
                      </Button>
                    )}
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
    </>
  );
};

export default Cart;
