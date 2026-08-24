import React from "react";
import Image from "next/image";
import {
  Popover,
  PopoverBackdrop,
  PopoverButton,
  PopoverPanel,
} from "@headlessui/react";
import { ChevronUpIcon } from "@heroicons/react/20/solid";
import { useUserContext } from "@/context/UserContext";
import { Coupon } from "../../../../common/types";
import { getUserCoupons } from "@/api/coupon";
import { calculateCouponDiscount } from "../../../../lib/utils/couponRules";
import { sizedImageUrl } from "../../../../sanity/lib/image";
import dayjs from "dayjs";
import { ProductContext } from "..";
import {
  calculateShippingFee,
  hasDeliveryItem,
  RURAL_SURCHARGE,
  SHIPPING_FEE,
} from "../../../../lib/utils/deliveryRules";
import { DeliveryType } from "../../../../common/enums/DeliveryType";

const OrderSummary = () => {
  const { userInfo } = useUserContext();
  const {
    products,
    setTotalPrice,
    selectedCouponIds,
    setDiscountAmount,
    availableCoupons,
    setAvailableCoupons,
    validatedAddress,
  } = React.useContext(ProductContext);

  const isRuralDelivery = validatedAddress?.isRuralDelivery ?? false;

  // Display-only: the base shipping line, shown separately from the rural
  // surcharge line below so the two don't visually double up.
  const baseShippingCost = React.useCallback(() => {
    return hasDeliveryItem(products) ? SHIPPING_FEE.toFixed(2) : "0.00";
  }, [products]);

  // Total shipping-related fee (base + rural surcharge, if any) — used for
  // the actual total/Stripe amount, not for display.
  const shippingCost = React.useCallback(() => {
    return calculateShippingFee(
      hasDeliveryItem(products),
      isRuralDelivery,
    ).toFixed(2);
  }, [products, isRuralDelivery]);

  React.useEffect(() => {
    if (!userInfo?._id) return;

    // Merge rather than overwrite: session refetches on window focus give
    // `userInfo` a new object identity and re-run this effect, but a global
    // coupon unlocked via code isn't returned by getUserCoupons() (it's
    // client-only state) — a plain overwrite would silently drop it.
    getUserCoupons()
      .then((data) => {
        const personalCoupons = data.data as Coupon[];
        setAvailableCoupons((prev) => {
          const unlockedGlobals = prev.filter(
            (c) => c.isGlobal && !personalCoupons.some((p) => p._id === c._id),
          );
          return [...personalCoupons, ...unlockedGlobals];
        });
      })
      .catch((err) => console.error(err));
  }, [userInfo, setAvailableCoupons]);

  const couponDiscount = (): number => {
    const selected = availableCoupons.filter((c) =>
      selectedCouponIds.includes(c._id ?? ""),
    );
    const itemPrices = products.map(({ price }) => price);
    return calculateCouponDiscount(selected, itemPrices);
  };

  const formatDate = (date: string) => {
    return dayjs(date).format("D MMMM YYYY");
  };

  const formatDeliveryType = (deliveryType: DeliveryType) => {
    return deliveryType === DeliveryType.Pickup
      ? "Pickup (Auckland)"
      : "Delivery";
  };

  const sumPrices = (): string => {
    return products.reduce((n, { price }) => n + price, 0).toFixed(2);
  };

  const sumTotalPrices = () => {
    const subtotal = parseFloat(sumPrices());
    const shipping = parseFloat(shippingCost());
    const discount = couponDiscount();
    const total = Math.max(0, subtotal + shipping - discount);
    setTotalPrice(Math.round(total * 100)); // Store as cents if needed
    setDiscountAmount(discount);
    return total.toFixed(2);
  };

  return (
    <>
      <section
        aria-labelledby="summary-heading"
        className="bg-gray-50 px-4 pb-10 pt-16 sm:px-6 lg:col-start-2 lg:row-start-1 lg:bg-transparent lg:px-0 lg:pb-16"
      >
        <div className="mx-auto max-w-lg lg:max-w-none">
          <h2
            id="summary-heading"
            className="text-lg font-medium text-gray-900"
          >
            Order summary
          </h2>

          <ul
            role="list"
            className="divide-y divide-gray-200 text-sm font-medium text-gray-900"
          >
            {products.map((product) => (
              <li key={product._id} className="flex items-start space-x-4 py-6">
                <Image
                  alt={product.name}
                  src={sizedImageUrl(product.images[0], { width: 160 })}
                  width={80}
                  height={80}
                  className="h-20 w-20 flex-none rounded-md object-cover object-center"
                />
                <div className="flex-auto space-y-1">
                  <h3>{product.name}</h3>
                  <p className="text-gray-500">{product.size}</p>
                  <p className="text-gray-500">
                    {formatDate(product.dateBooked)}
                  </p>
                  <p className="text-gray-500">
                    {formatDeliveryType(product.deliveryType)}
                  </p>
                </div>
                <p className="flex-none text-base font-medium">
                  ${product.price}
                </p>
              </li>
            ))}
          </ul>

          <dl className="hidden space-y-6 border-t border-gray-200 pt-6 text-sm font-medium text-gray-900 lg:block">
            <div className="flex items-center justify-between">
              <dt className="text-gray-600">Subtotal</dt>
              <dd>${sumPrices()}</dd>
            </div>

            {couponDiscount() > 0 && (
              <div className="flex items-center justify-between">
                <dt className="text-gray-600">Coupon discount</dt>
                <dd>-${couponDiscount().toFixed(2)}</dd>
              </div>
            )}

            <div className="flex items-center justify-between">
              <dt className="text-gray-600">Shipping</dt>
              <dd>${baseShippingCost()}</dd>
            </div>

            {isRuralDelivery && (
              <div className="flex items-center justify-between">
                <dt className="text-gray-600">Rural delivery surcharge</dt>
                <dd>${RURAL_SURCHARGE.toFixed(2)}</dd>
              </div>
            )}

            <div className="flex items-center justify-between border-t border-gray-200 pt-6">
              <dt className="text-base">Total</dt>
              <dd className="text-base">${sumTotalPrices()}</dd>
            </div>
          </dl>

          <Popover className="fixed inset-x-0 bottom-0 flex flex-col-reverse text-sm font-medium text-gray-900 lg:hidden">
            <div className="relative z-10 border-t border-gray-200 bg-white px-4 sm:px-6">
              <div className="mx-auto max-w-lg">
                <PopoverButton className="flex w-full items-center py-6 font-medium">
                  <span className="mr-auto text-base">Total</span>
                  <span className="mr-2 text-base">${sumTotalPrices()}</span>
                  <ChevronUpIcon
                    aria-hidden="true"
                    className="h-5 w-5 text-gray-500"
                  />
                </PopoverButton>
              </div>
            </div>

            <PopoverBackdrop
              transition
              className="fixed inset-0 bg-black bg-opacity-25 transition-opacity duration-300 ease-linear data-[closed]:opacity-0"
            />

            <PopoverPanel
              transition
              className="relative transform bg-white px-4 py-6 transition duration-300 ease-in-out data-[closed]:translate-y-full sm:px-6"
            >
              <dl className="mx-auto max-w-lg space-y-6">
                <div className="flex items-center justify-between">
                  <dt className="text-gray-600">Subtotal</dt>
                  <dd>${sumPrices()}</dd>
                </div>

                {couponDiscount() > 0 && (
                  <div className="flex items-center justify-between">
                    <dt className="text-gray-600">Coupon discount</dt>
                    <dd>-${couponDiscount().toFixed(2)}</dd>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <dt className="text-gray-600">Shipping</dt>
                  <dd>${baseShippingCost()}</dd>
                </div>

                {isRuralDelivery && (
                  <div className="flex items-center justify-between">
                    <dt className="text-gray-600">Rural delivery surcharge</dt>
                    <dd>${RURAL_SURCHARGE.toFixed(2)}</dd>
                  </div>
                )}
              </dl>
            </PopoverPanel>
          </Popover>
        </div>
      </section>
    </>
  );
};

export default OrderSummary;
