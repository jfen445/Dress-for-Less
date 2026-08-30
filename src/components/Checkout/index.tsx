"use client";

import React from "react";
import OrderSummary from "./OrderSummary";
import { CartItemType, CartType, Coupon } from "../../../common/types";
import CheckoutForm from "./CheckoutForm";
import Spinner from "../Spinner";
import { useUserContext } from "@/context/UserContext";
import { useSession } from "next-auth/react";
import { getCart } from "@/api/cart";
import { useGlobalContext } from "@/context/GlobalContext";

export type ValidatedAddress = {
  addressText: string;
  nzPostAddressId: string;
  nzPostDpid: string;
  isRuralDelivery: boolean;
  ruralDeliveryNumber?: string;
};

interface ProductCtx {
  products: CartItemType[];
  setProducts: React.Dispatch<React.SetStateAction<CartItemType[]>>;
  totalPrice: number;
  setTotalPrice: React.Dispatch<React.SetStateAction<number>>;
  selectedCouponIds: string[];
  setSelectedCouponIds: React.Dispatch<React.SetStateAction<string[]>>;
  discountAmount: number;
  setDiscountAmount: React.Dispatch<React.SetStateAction<number>>;
  availableCoupons: Coupon[];
  setAvailableCoupons: React.Dispatch<React.SetStateAction<Coupon[]>>;
  validatedAddress: ValidatedAddress | null;
  setValidatedAddress: React.Dispatch<
    React.SetStateAction<ValidatedAddress | null>
  >;
}

export const ProductContext = React.createContext<ProductCtx>({} as ProductCtx);

const Checkout = () => {
  const [totalPrice, setTotalPrice] = React.useState<number>(0);
  const [products, setProducts] = React.useState<CartItemType[]>([]);
  const [selectedCouponIds, setSelectedCouponIds] = React.useState<string[]>(
    [],
  );
  const [discountAmount, setDiscountAmount] = React.useState<number>(0);
  const [availableCoupons, setAvailableCoupons] = React.useState<Coupon[]>([]);
  const [validatedAddress, setValidatedAddress] =
    React.useState<ValidatedAddress | null>(null);

  const { userInfo } = useUserContext();
  const { getDressById } = useGlobalContext();
  const { status } = useSession();
  const [isLoadingProducts, setIsLoadingProducts] =
    React.useState<boolean>(true);

  // The cart is fetched here rather than in OrderSummary because this component
  // owns `products`, and because everything below reads that array: an empty one
  // is indistinguishable from a real order with no delivery items and nothing
  // past its cutoff, so rendering before it arrives shows a $0 total and briefly
  // passes gates that should fail.
  React.useEffect(() => {
    if (status === "loading") return;

    if (!userInfo?._id) {
      // Nothing to load a cart for. The API client redirects on 401, but don't
      // spin forever if we somehow land here signed out.
      if (status === "unauthenticated") setIsLoadingProducts(false);
      return;
    }

    let cancelled = false;
    const productIds = new URLSearchParams(window.location.search).getAll("id");

    const loadProducts = async () => {
      try {
        const data = await getCart(userInfo._id as string);
        const cartItems = data.data as unknown as CartType[];
        const selectedItems = cartItems.filter((item) =>
          productIds.includes(item._id ?? ""),
        );

        const dresses = await Promise.all(
          selectedItems.map(async (item) => {
            const dress = await getDressById(item.dressId);
            if (!dress) return null;

            // Copied, never mutated in place: getDressById hands back the one
            // cached record for this dress, so writing the line's date and size
            // onto it would leak them into every other line sharing that dress.
            return {
              ...dress,
              dateBooked: item.dateBooked,
              cartItemId: item._id,
              size: item.size,
              deliveryType: item.deliveryType,
            } as CartItemType;
          }),
        );

        if (!cancelled)
          setProducts(
            dresses.filter((dress): dress is CartItemType => Boolean(dress)),
          );
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setIsLoadingProducts(false);
      }
    };

    loadProducts();

    return () => {
      cancelled = true;
    };
  }, [userInfo, status, getDressById]);

  return (
    <ProductContext.Provider
      value={{
        products,
        setProducts,
        totalPrice,
        setTotalPrice,
        selectedCouponIds,
        setSelectedCouponIds,
        discountAmount,
        setDiscountAmount,
        availableCoupons,
        setAvailableCoupons,
        validatedAddress,
        setValidatedAddress,
      }}
    >
      <div className="bg-white">
        {/* Background color split screen for large screens */}
        <div
          aria-hidden="true"
          className="fixed left-0 hidden h-full w-1/2 bg-white lg:block"
        />
        <div
          aria-hidden="true"
          className="fixed right-0 hidden h-full w-1/2 bg-gray-50 lg:block"
        />

        {isLoadingProducts ? (
          <div className="relative mx-auto max-w-7xl py-32">
            <Spinner />
          </div>
        ) : (
          <div className="relative mx-auto grid max-w-7xl grid-cols-1 gap-x-16 lg:grid-cols-2 lg:px-8 xl:gap-x-48">
            <OrderSummary />

            <CheckoutForm />
          </div>
        )}
      </div>
    </ProductContext.Provider>
  );
};

export default Checkout;

//

// Make sure to call `loadStripe` outside of a component’s render to avoid
// recreating the `Stripe` object on every render.
