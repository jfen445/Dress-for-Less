"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { DressType } from "../../../../common/types";
import { useDressContext } from "@/context/DressContext";
import Pagination from "./Pagination";
import { sizedImageUrl } from "../../../../sanity/lib/image";

const GRID_CLASSES =
  "grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-2 sm:gap-x-6 lg:grid-cols-3 xl:gap-x-8";

// Placeholders rather than a centred spinner: a filter change is a round-trip
// now, and collapsing the page to a spinner every time jumps the scroll
// position and the footer.
const DressGridSkeleton = ({ count }: { count: number }) => (
  <section className={GRID_CLASSES} aria-hidden="true">
    {Array.from({ length: count }, (_, index) => (
      <div key={index} className="animate-pulse">
        <div className="aspect-[3/4] w-full rounded-lg bg-gray-200" />
        <div className="mt-4 space-y-2">
          <div className="h-3 w-1/2 rounded bg-gray-200" />
          <div className="h-4 w-3/4 rounded bg-gray-200" />
        </div>
      </div>
    ))}
  </section>
);

const DressGrid = () => {
  const { items, query, totalPages, isLoading, isError, setPage } =
    useDressContext();
  const gridTopRef = React.useRef<HTMLDivElement>(null);

  const handlePageChange = (page: number) => {
    setPage(page);
    gridTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <>
      <div ref={gridTopRef} />

      {isLoading ? (
        // Sized to the page being fetched, not to what is on screen, so the
        // layout settles once rather than twice.
        <DressGridSkeleton count={Math.min(query.pageSize, 12)} />
      ) : isError ? (
        <p className="mt-20 text-center text-sm text-gray-500">
          We couldn&apos;t load these dresses just now. Please try again.
        </p>
      ) : items.length === 0 ? (
        <p className="mt-20 text-center text-sm text-gray-500">
          No dresses match these filters.
        </p>
      ) : (
        <section className={GRID_CLASSES}>
          {items.map((dress: DressType) => (
            <Link
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
            </Link>
          ))}
        </section>
      )}

      <Pagination
        currentPage={query.page}
        totalPages={totalPages}
        onPageChange={handlePageChange}
      />
    </>
  );
};

export default DressGrid;
