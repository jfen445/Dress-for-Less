import Button from "../Button";
import React from "react";
import { getCart, removeFromCart } from "@/api/cart";
import { useUserContext } from "@/context/UserContext";
import { CartItemType, CartType } from "../../../common/types";
import Link from "next/link";
import CartItems from "../CartItems";
import Spinner from "../Spinner";
import dayjs from "dayjs";
import Modal from "../Modal";
import { DialogTitle } from "@headlessui/react";
import { ExclamationCircleIcon } from "@heroicons/react/24/outline";
import { useSession } from "next-auth/react";
import { useGlobalContext } from "@/context/GlobalContext";
import useLocalStorage from "@/hooks/useLocalStorage";
import { useCartContext } from "@/context/CartContext";

const Cart = () => {
  const { refreshCart } = useCartContext();
  const { getDressWithId, allDresses } = useGlobalContext();
  const { getItems, setItems, clearItems } =
    useLocalStorage<CartType[]>("localCart");
  const { userInfo } = useUserContext();
  const { status } = useSession();
  const [products, setProducts] = React.useState<CartItemType[]>([]);
  const [selectedProductIds, setSelectedProductIds] = React.useState<string[]>(
    [],
  );
  const [err, setErr] = React.useState<boolean>(false);
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [isOpen, setIsOpen] = React.useState<boolean>(false);

  const isUserValid: boolean =
    userInfo?.name &&
    userInfo?.email &&
    userInfo.instagramHandle &&
    userInfo.mobileNumber // removed photo check
      ? true
      : false;

  const query = React.useCallback(() => {
    const params = new URLSearchParams();
    selectedProductIds.forEach((id) => params.append("id", id.toString()));
    return params;
  }, [selectedProductIds]);

  const getUserCart = React.useCallback(async () => {
    setIsLoading(true);
    setErr(false);

    const buildCartProducts = (cartItems: CartType[]) => {
      const items = cartItems
        .map((item) => {
          const dress = getDressWithId(item.dressId);
          if (!dress) return null;

          const cartItemId =
            item._id ?? `${item.dressId}-${item.dateBooked}-${item.size}`;

          return {
            _id: dress._id,
            name: dress.name,
            description: dress.description,
            size: item.size,
            images: dress.images,
            tags: dress.tags,
            price: dress.price,
            length: dress.length,
            brand: dress.brand,
            rrp: dress.rrp,
            stretch: dress.stretch,
            dateBooked: item.dateBooked,
            cartItemId,
          } as CartItemType;
        })
        .filter((product): product is CartItemType => Boolean(product));

      setProducts(items);
      setSelectedProductIds((prev) =>
        prev.filter((id) => items.some((product) => product.cartItemId === id)),
      );
      setErr(items.length === 0);
    };

    try {
      if (userInfo && userInfo._id) {
        const data = await getCart(userInfo._id);
        const cartItems = (data.data ?? []) as CartType[];

        if (cartItems.length === 0) {
          setProducts([]);
          setSelectedProductIds([]);
          setErr(true);
          return;
        }

        buildCartProducts(cartItems);
        return;
      }

      const cartItems = getItems() ?? [];
      if (cartItems.length === 0) {
        setProducts([]);
        setSelectedProductIds([]);
        setErr(true);
        return;
      }

      buildCartProducts(cartItems);
    } catch (error) {
      setProducts([]);
      setSelectedProductIds([]);
      setErr(true);
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, [getDressWithId, userInfo, getItems, allDresses]);

  React.useEffect(() => {
    getUserCart().catch(() => setErr(true));
  }, [getUserCart, userInfo]);

  const removeItem = async (cartItemId: CartItemType) => {
    if (status === "unauthenticated") {
      const localCart = getItems() || ([] as CartType[]);

      const updatedCart = localCart.filter(
        (item) =>
          !(
            item.dressId === cartItemId._id &&
            item.dateBooked === cartItemId.dateBooked &&
            item.size === cartItemId.size
          ),
      );

      setSelectedProductIds((prev) =>
        prev.filter((id) => id !== cartItemId.cartItemId),
      );

      if (updatedCart.length === 0) {
        clearItems();
        setProducts([]);
        setErr(true);
        refreshCart();
        return;
      }

      setItems(updatedCart);
      await getUserCart();
      refreshCart();
      return;
    }

    try {
      await removeFromCart(cartItemId.cartItemId);
      setSelectedProductIds((prev) =>
        prev.filter((id) => id !== cartItemId.cartItemId),
      );
      refreshCart();
      await getUserCart();
    } catch (error) {
      console.error(error);
    }
  };

  const isValidCheckout = () => {
    const selectedProducts = products.filter((item) =>
      selectedProductIds.includes(item.cartItemId),
    );

    const isDatesValid = selectedProducts.some((item) =>
      isInvalidDate(item.dateBooked),
    );

    const isEmpty = selectedProductIds.length == 0;

    return isDatesValid || isEmpty;
  };

  const isInvalidDate = (day: string | number | Date) => {
    const currentDate = dayjs(new Date());
    return dayjs(currentDate).isAfter(dayjs(new Date(day)));
  };

  const isAuthenticated = status === "authenticated";
  const checkoutDisabled = isValidCheckout();

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
              {isAuthenticated ? "Profile Incomplete" : "Login Required"}
            </DialogTitle>
            <div className="mt-2">
              <p className="text-sm text-gray-500">
                {isAuthenticated
                  ? "To checkout, you must update your profile with your mobile number and ID photo"
                  : "To checkout, you must login to your account"}
              </p>
            </div>
          </div>
        </div>
        <div className="mt-5 sm:mt-6">
          {isAuthenticated ? (
            <Link href={"/account"}>
              <Button
                type="button"
                onClick={() => setIsOpen(false)}
                className="inline-flex w-full justify-center"
              >
                Go to Account Settings
              </Button>
            </Link>
          ) : (
            <Link href={"/login"}>
              <Button
                type="button"
                onClick={() => setIsOpen(false)}
                className="inline-flex w-full justify-center"
              >
                Create an account
              </Button>
            </Link>
          )}
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
                      checkoutDisabled ? (
                        <Button type="button" disabled variant="secondary">
                          Checkout
                        </Button>
                      ) : (
                        <Link
                          href={{
                            pathname: "/checkout",
                            query: query().toString(),
                          }}
                        >
                          <Button type="submit" variant="secondary">
                            Checkout
                          </Button>
                        </Link>
                      )
                    ) : (
                      <Button
                        type="button"
                        disabled={false}
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
