"use client";

import React from "react";
import OrderSummary from "./OrderSummary";
import { CartItemType, Coupon } from "../../../common/types";
import CheckoutForm from "./CheckoutForm";
import { DeliveryType } from "../../../common/enums/DeliveryType";

interface ProductCtx {
  products: CartItemType[];
  setProducts: React.Dispatch<React.SetStateAction<CartItemType[]>>;
  deliveryOption: DeliveryType;
  setDeliveryOption: React.Dispatch<React.SetStateAction<DeliveryType>>;
  totalPrice: number;
  setTotalPrice: React.Dispatch<React.SetStateAction<number>>;
  selectedCouponIds: string[];
  setSelectedCouponIds: React.Dispatch<React.SetStateAction<string[]>>;
  discountAmount: number;
  setDiscountAmount: React.Dispatch<React.SetStateAction<number>>;
  availableCoupons: Coupon[];
  setAvailableCoupons: React.Dispatch<React.SetStateAction<Coupon[]>>;
}

export const ProductContext = React.createContext<ProductCtx>({} as ProductCtx);

const Checkout = () => {
  const [deliveryOption, setDeliveryOption] = React.useState<DeliveryType>(
    DeliveryType.Delivery,
  );

  const [totalPrice, setTotalPrice] = React.useState<number>(0);
  const [products, setProducts] = React.useState<CartItemType[]>([]);
  const [selectedCouponIds, setSelectedCouponIds] = React.useState<string[]>(
    [],
  );
  const [discountAmount, setDiscountAmount] = React.useState<number>(0);
  const [availableCoupons, setAvailableCoupons] = React.useState<Coupon[]>(
    [],
  );

  return (
    <ProductContext.Provider
      value={{
        products,
        setProducts,
        deliveryOption,
        setDeliveryOption,
        totalPrice,
        setTotalPrice,
        selectedCouponIds,
        setSelectedCouponIds,
        discountAmount,
        setDiscountAmount,
        availableCoupons,
        setAvailableCoupons,
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

        <div className="relative mx-auto grid max-w-7xl grid-cols-1 gap-x-16 lg:grid-cols-2 lg:px-8 xl:gap-x-48">
          <OrderSummary />

          {/* <Payment /> */}

          <CheckoutForm />

          {/* <Elements stripe={stripePromise}>
            <PaymentForm />
          </Elements> */}
        </div>
      </div>
    </ProductContext.Provider>
  );
};

export default Checkout;

//

// Make sure to call `loadStripe` outside of a component’s render to avoid
// recreating the `Stripe` object on every render.
