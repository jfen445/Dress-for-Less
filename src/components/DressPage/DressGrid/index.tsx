"use client";

import * as React from "react";
import Image from "next/image";
import { DressType } from "../../../../common/types";
import { useDressContext } from "@/context/DressContext";
import Spinner from "@/components/Spinner";
import Pagination from "./Pagination";
import { sizedImageUrl } from "../../../../sanity/lib/image";

const PAGE_SIZE = 30;

const DressGrid = () => {
  const { filteredDressList, isLoading } = useDressContext();
  const [currentPage, setCurrentPage] = React.useState(1);
  const gridTopRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [filteredDressList]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    gridTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const totalPages = React.useMemo(
    () => Math.max(1, Math.ceil((filteredDressList?.length ?? 0) / PAGE_SIZE)),
    [filteredDressList],
  );

  const paginatedDressList = React.useMemo(
    () =>
      filteredDressList?.slice(
        (currentPage - 1) * PAGE_SIZE,
        currentPage * PAGE_SIZE,
      ),
    [filteredDressList, currentPage],
  );

  return (
    <>
      {isLoading ? (
        <div className="flex justify-center mt-20">
          <Spinner />
        </div>
      ) : (
        <>
          <div ref={gridTopRef} />
          <section className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-2 sm:gap-x-6 lg:grid-cols-3 xl:gap-x-8">
            {paginatedDressList?.map((dress: DressType) => (
              <a
                key={dress._id}
                href={`/dresses/products/${dress._id}`}
                className="group"
              >
                <div className="relative aspect-[3/4] w-full overflow-hidden rounded-lg">
                  <Image
                    src={sizedImageUrl(dress.images[0], { width: 600 })}
                    alt={dress.name}
                    fill
                    sizes="(min-width: 1024px) 33vw, 50vw"
                    className="object-cover object-center group-hover:opacity-75"
                  />
                </div>
                <div className="mt-4">
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <p>{dress.brand}</p>
                    <p>${dress.price}</p>
                  </div>
                  <h3 className="text-base font-medium text-gray-900">
                    {dress.name}
                  </h3>
                </div>
              </a>
            ))}
          </section>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        </>
      )}
    </>
  );
};

export default DressGrid;
