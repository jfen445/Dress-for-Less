"use client";

import * as React from "react";
import { getDress } from "../../../../sanity/sanity.query";
import { DressType } from "../../../../types";

const DressGrid = () => {
  const [dresses, setDresses] = React.useState<DressType[]>([]);

  console.log("dress here ", dresses);

  React.useEffect(() => {
    getDress().then((data) => {
      setDresses(data);
    });
  }, []);

  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:gap-x-8">
      {dresses?.map((dress) => (
        <a key={dress._id} href="" className="group">
          <div className="aspect-h-1 aspect-w-1 w-full overflow-hidden rounded-lg sm:aspect-h-3 sm:aspect-w-2">
            <img
              src={dress.images[0]}
              alt="test"
              className="h-full w-full object-cover object-center group-hover:opacity-75"
            />
          </div>
          <div className="mt-4 flex items-center justify-between text-base font-medium text-gray-900">
            <h3>{dress.name}</h3>
            <p>55</p>
          </div>
          <p className="mt-1 text-sm italic text-gray-500">
            {dress.description}
          </p>
        </a>
      ))}
    </div>
  );
};

export default DressGrid;
