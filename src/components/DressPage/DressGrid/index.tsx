"use client";

import * as React from "react";
import { getAllDresses } from "../../../../sanity/sanity.query";
import { DressType } from "../../../../types";
import Image from "next/image";

const DressGrid = () => {
  const [dresses, setDresses] = React.useState<DressType[]>([]);

  console.log("dress here ", dresses);

  React.useEffect(() => {
    getAllDresses().then((data) => {
      setDresses(data);
    });
  }, []);

  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:gap-x-8">
      {dresses?.map((dress) => (
        <a
          key={dress._id}
          href={`/dresses/products/${dress._id}`}
          className="group"
        >
          <div className="aspect-h-1 aspect-w-1 w-full overflow-hidden rounded-lg sm:aspect-h-3 sm:aspect-w-2">
            <img
              src={dress.images[0]}
              alt="test"
              className="w-full h-96 object-cover object-center group-hover:opacity-75"
            />
          </div>
          <div className="mt-4 flex items-center justify-between text-base font-medium text-gray-900">
            <h3>{dress.name}</h3>
            <p>55</p>
          </div>
        </a>
      ))}
    </div>
  );
};

export default DressGrid;
