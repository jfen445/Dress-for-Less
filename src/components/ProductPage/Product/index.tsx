/*
  This example requires some changes to your config:
  
  ```
  // tailwind.config.js
  module.exports = {
    // ...
    plugins: [
      // ...
      require('@tailwindcss/aspect-ratio'),
    ],
  }
  ```
*/
"use client";
import * as React from "react";
import { useParams } from "next/navigation";

import {
  CheckIcon,
  QuestionMarkCircleIcon,
  StarIcon,
} from "@heroicons/react/20/solid";
import { RadioGroup } from "@headlessui/react";
import { ShieldCheckIcon } from "@heroicons/react/24/outline";
import { getDress } from "../../../../sanity/sanity.query";
import { DressType, ImageType } from "../../../../types";
import ImageSelector from "../ImageSelector";

const product = {
  name: "Everyday Ruck Snack",
  href: "#",
  price: "$220",
  description:
    "Don't compromise on snack-carrying capacity with this lightweight and spacious bag. The drawstring top keeps all your favorite chips, crisps, fries, biscuits, crackers, and cookies secure.",
  imageSrc:
    "https://tailwindui.com/img/ecommerce-images/product-page-04-featured-product-shot.jpg",
  imageAlt:
    "Model wearing light green backpack with black canvas straps and front zipper pouch.",
  breadcrumbs: [
    { id: 1, name: "Travel", href: "#" },
    { id: 2, name: "Bags", href: "#" },
  ],
  sizes: [
    { name: "18L", description: "Perfect for a reasonable amount of snacks." },
    { name: "20L", description: "Enough room for a serious amount of snacks." },
  ],
};
const reviews = { average: 4, totalCount: 1624 };

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

const Product = () => {
  const [selectedSize, setSelectedSize] = React.useState(product.sizes[0]);
  const [dress, setDress] = React.useState<DressType>();
  const [images, setImages] = React.useState<ImageType[]>([]);

  const params = useParams<{ id: string }>();
  console.log("param", params, params.id);

  React.useEffect(() => {
    getDress(params.id).then((data) => {
      console.log("IS THIS OWRKING", data);
      setDress(data);

      var obj = data.images.reduce(function (
        acc: { [x: string]: any },
        cur: any,
        i: string | number
      ) {
        var o = { src: cur, alt: data.name + cur };
        acc[i] = o;
        return acc;
      },
      []);

      setImages(obj);
      console.log("huhuhuh", obj);
    });
  }, [params.id]);

  return (
    <div className="bg-white">
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:grid lg:max-w-7xl lg:grid-cols-2 lg:gap-x-8 lg:px-8">
        {/* Product details */}
        <div className="lg:max-w-lg lg:self-end">
          <div className="mt-4">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              {dress?.name}
            </h1>
          </div>

          <section aria-labelledby="information-heading" className="mt-4">
            <h2 id="information-heading" className="sr-only">
              Product information
            </h2>

            <div className="flex items-center">
              <p className="text-lg text-gray-900 sm:text-xl">
                {product.price}
              </p>
            </div>

            <div className="mt-4 space-y-6">
              <p className="text-base text-gray-500">{dress?.description}</p>
            </div>
          </section>
          <section aria-labelledby="options-heading">
            <h2 id="options-heading" className="sr-only">
              Product options
            </h2>

            <form>
              <div className="sm:flex sm:justify-between">
                {/* Size selector */}
                <RadioGroup value={selectedSize} onChange={setSelectedSize}>
                  <RadioGroup.Label className="block text-sm font-medium text-gray-700">
                    Size: M
                  </RadioGroup.Label>
                </RadioGroup>
              </div>
              <div className="mt-10">
                <button
                  type="submit"
                  className="flex w-full items-center justify-center rounded-md border border-transparent bg-indigo-600 px-8 py-3 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-50"
                >
                  Add to bag
                </button>
              </div>
            </form>
          </section>
        </div>

        {/* Product image */}
        {/* <div className="mt-10 lg:col-start-2 lg:row-span-2 lg:mt-0 lg:self-center">
          <div className="aspect-h-1 aspect-w-1 overflow-hidden rounded-lg">
            <img
              src={dress?.images[0]}
              alt={product.imageAlt}
              className="h-full w-full object-cover object-center"
            />
          </div>
        </div> */}
        <ImageSelector images={images} />

        {/* Product form */}
        {/* <div className="mt-10 lg:col-start-1 lg:row-start-2 lg:max-w-lg lg:self-start"></div> */}
      </div>
    </div>
  );
};

export default Product;
