import * as React from "react";
import { GetStaticProps } from "next";
import DressGrid from "@/components/DressPage/DressGrid";
import Filters from "@/components/DressPage/Filters";
import DressContextProvider from "@/context/DressContext";
import Seo from "@/components/Seo";
import { getDressesForListing } from "../../sanity/sanity.query";
import { DressType } from "../../common/types";

interface DressPageProps {
  dresses: DressType[];
}

const DressPage = ({ dresses }: DressPageProps) => {
  return (
    <>
      <Seo
        title="Shop Dresses | Dress for Less"
        description="Browse our full range of designer dresses available to hire — filter by size, style, and occasion. Delivered or ready for pickup across New Zealand."
        path="/dresses"
      />
      <div className="bg-white">
        <main>
          <DressContextProvider initialDresses={dresses}>
            <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:max-w-7xl lg:px-8">
              {/* Filters */}
              <Filters />

              {/* Product grid */}
              <section aria-labelledby="products-heading" className="my-8">
                <h2 id="products-heading" className="sr-only">
                  Products
                </h2>
                <DressGrid />
              </section>
            </div>
          </DressContextProvider>
        </main>
      </div>
    </>
  );
};

export default DressPage;

export const getStaticProps: GetStaticProps<DressPageProps> = async () => {
  // Trimmed listing projection (not the full getAllDressesFromSanity), since
  // Filters/DressGrid only ever read name/brand/price/first image/tags/sizes —
  // the full catalogue's description/notes/all-images bloat this page's data
  // payload for no display benefit here.
  const dresses = (await getDressesForListing()) as DressType[];

  return {
    props: { dresses },
    revalidate: 1800,
  };
};
