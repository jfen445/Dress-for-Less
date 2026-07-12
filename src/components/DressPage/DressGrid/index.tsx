"use client";

import * as React from "react";
import { DressType } from "../../../../common/types";
import { useDressContext } from "@/context/DressContext";
import Spinner from "@/components/Spinner";

const DressGrid = () => {
  const { filteredDressList, isLoading } = useDressContext();

  return (
    <>
      {isLoading ? (
        <div className="flex justify-center mt-20">
          <Spinner />
        </div>
      ) : (
        <section className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:gap-x-8">
          {filteredDressList?.map((dress: DressType) => (
            <a
              key={dress._id}
              href={`/dresses/products/${dress._id}`}
              className="group"
            >
              <div className="aspect-[3/4] w-full overflow-hidden rounded-lg">
                <img
                  src={dress.images[0]}
                  alt="test"
                  className="w-full h-full object-cover object-center group-hover:opacity-75"
                />
              </div>
              <div className="mt-4 flex items-center justify-between text-base font-medium text-gray-900">
                <div>
                  <p className="text-gray-500 text-sm">{dress.brand}</p>
                  <h3>{dress.name}</h3>
                </div>
                <p className="text-gray-500 text-sm">${dress.price}</p>
              </div>
            </a>
          ))}
        </section>
      )}
    </>
  );
};

export default DressGrid;
