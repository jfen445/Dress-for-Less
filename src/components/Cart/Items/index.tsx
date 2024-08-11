import React from "react";
import {
  Popover,
  PopoverBackdrop,
  PopoverButton,
  PopoverPanel,
} from "@headlessui/react";
import { ChevronUpIcon } from "@heroicons/react/20/solid";

const products = [
  {
    id: 1,
    name: "Micro Backpack",
    href: "#",
    price: "$70.00",
    color: "Moss",
    size: "5L",
    imageSrc:
      "https://tailwindui.com/img/ecommerce-images/checkout-page-04-product-01.jpg",
    imageAlt:
      "Moss green canvas compact backpack with double top zipper, zipper front pouch, and matching carry handle and backpack straps.",
  },
  // More products...
];

const Item = () => {
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
              <li key={product.id} className="flex items-start space-x-4 py-6">
                <img
                  alt={product.imageAlt}
                  src={product.imageSrc}
                  className="h-20 w-20 flex-none rounded-md object-cover object-center"
                />
                <div className="flex-auto space-y-1">
                  <h3>{product.name}</h3>
                  <p className="text-gray-500">{product.color}</p>
                  <p className="text-gray-500">{product.size}</p>
                </div>
                <p className="flex-none text-base font-medium">
                  {product.price}
                </p>
              </li>
            ))}
          </ul>

          <dl className="hidden space-y-6 border-t border-gray-200 pt-6 text-sm font-medium text-gray-900 lg:block">
            <div className="flex items-center justify-between">
              <dt className="text-gray-600">Subtotal</dt>
              <dd>$320.00</dd>
            </div>

            <div className="flex items-center justify-between">
              <dt className="text-gray-600">Shipping</dt>
              <dd>$15.00</dd>
            </div>

            <div className="flex items-center justify-between">
              <dt className="text-gray-600">Taxes</dt>
              <dd>$26.80</dd>
            </div>

            <div className="flex items-center justify-between border-t border-gray-200 pt-6">
              <dt className="text-base">Total</dt>
              <dd className="text-base">$361.80</dd>
            </div>
          </dl>

          <Popover className="fixed inset-x-0 bottom-0 flex flex-col-reverse text-sm font-medium text-gray-900 lg:hidden">
            <div className="relative z-10 border-t border-gray-200 bg-white px-4 sm:px-6">
              <div className="mx-auto max-w-lg">
                <PopoverButton className="flex w-full items-center py-6 font-medium">
                  <span className="mr-auto text-base">Total</span>
                  <span className="mr-2 text-base">$361.80</span>
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
                  <dd>$320.00</dd>
                </div>

                <div className="flex items-center justify-between">
                  <dt className="text-gray-600">Shipping</dt>
                  <dd>$15.00</dd>
                </div>

                <div className="flex items-center justify-between">
                  <dt className="text-gray-600">Taxes</dt>
                  <dd>$26.80</dd>
                </div>
              </dl>
            </PopoverPanel>
          </Popover>
        </div>
      </section>
    </>
  );
};

export default Item;
