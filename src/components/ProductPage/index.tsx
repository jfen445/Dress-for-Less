"use client";

import * as React from "react";
import { useParams } from "next/navigation";

import { RadioGroup } from "@headlessui/react";
import { getDress } from "../../../sanity/sanity.query";
import { DressType, ImageType } from "../../../common/types";
import ImageSelector from "./ImageSelector";
import Button from "@/components/Button";
import Calendar from "./Calendar";

const Product = () => {
  const [dress, setDress] = React.useState<DressType>();
  const [images, setImages] = React.useState<ImageType[]>([]);

  const params = useParams<{ id: string }>();

  React.useEffect(() => {
    if (params) {
      getDress(params.id).then((data) => {
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
      });
    }
  }, [params, params?.id]);

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
                ${dress?.price}{" "}
                <text className="text-xs text-gray-400">
                  RRP: ${dress?.rrp}
                </text>
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

            <div className="mt-5">
              <RadioGroup className="block text-sm font-medium text-gray-700">
                Size: {dress?.size}
              </RadioGroup>
              <RadioGroup className="block text-sm font-medium text-gray-700">
                Length: {dress?.length}
              </RadioGroup>
              <RadioGroup className="block text-sm font-medium text-gray-700">
                Stretch: {dress?.stretch}
              </RadioGroup>
            </div>

            <Calendar></Calendar>

            <div className="mt-10">
              <Button className="flex w-full items-center justify-center rounded-md border border-transparent bg-indigo-600 px-8 py-3 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-50">
                Making a booking
              </Button>
            </div>
          </section>
        </div>
        <ImageSelector images={images} />
      </div>
    </div>
  );
};

export default Product;
