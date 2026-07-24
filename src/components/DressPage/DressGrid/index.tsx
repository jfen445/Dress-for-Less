"use client";

import * as React from "react";
import { DressType } from "../../../../common/types";
import { useDressContext } from "@/context/DressContext";
import Spinner from "@/components/Spinner";
import Pagination from "./Pagination";

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
    [filteredDressList]
  );

  const paginatedDressList = React.useMemo(
    () =>
      filteredDressList?.slice(
        (currentPage - 1) * PAGE_SIZE,
        currentPage * PAGE_SIZE
      ),
    [filteredDressList, currentPage]
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
          <section className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:gap-x-8">
            {paginatedDressList?.map((dress: DressType) => (
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
