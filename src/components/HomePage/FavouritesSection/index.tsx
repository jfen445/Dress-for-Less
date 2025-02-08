import React from "react";
import { useGlobalContext } from "@/context/GlobalContext";
import { DressType } from "../../../../common/types";

const FavouritesSection = () => {
  const { allDresses, getFavouriteDresses } = useGlobalContext();
  const [dresses, setDresses] = React.useState<DressType[]>(
    getFavouriteDresses()
  );

  React.useEffect(() => {
    setDresses(getFavouriteDresses());
  }, [allDresses, getFavouriteDresses]);

  return (
    <>
      {dresses && dresses.length != 0 && (
        <section aria-labelledby="favorites-heading">
          <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
            <div className="sm:flex sm:items-baseline sm:justify-between">
              <h2
                id="favorites-heading"
                className="text-2xl font-bold tracking-tight text-gray-900"
              >
                Our Favorites
              </h2>
              <a
                href="#"
                className="hidden text-sm font-semibold text-indigo-600 hover:text-indigo-500 sm:block"
              >
                Browse all favorites
                <span aria-hidden="true"> &rarr;</span>
              </a>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-y-10 sm:grid-cols-3 sm:gap-x-6 sm:gap-y-0 lg:gap-x-8">
              {dresses.map((dress: any) => (
                <div key={dress._id} className="group relative">
                  <div className="h-96 w-full overflow-hidden rounded-lg sm:aspect-h-3 sm:aspect-w-2 group-hover:opacity-75 sm:h-auto">
                    <img
                      src={dress.images[0]}
                      alt={dress.name}
                      className="w-full h-[500px] object-cover object-center group-hover:opacity-75"
                    />
                  </div>
                  <h3 className="mt-4 text-base font-semibold text-gray-900">
                    <a href={`/dresses/products/${dress._id}`}>
                      <span className="absolute inset-0" />
                      {dress.name}
                    </a>
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">{dress.price}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 sm:hidden">
              <a
                href={"/dresses"}
                className="block text-sm font-semibold text-secondary-pink hover:text-primary-pink"
              >
                Browse all favorites
                <span aria-hidden="true"> &rarr;</span>
              </a>
            </div>
          </div>
        </section>
      )}
    </>
  );
};

export default FavouritesSection;
