import * as React from "react";
import DressGrid from "@/components/DressPage/DressGrid";
import Filters from "@/components/DressPage/Filters";
import DressContextProvider from "@/context/DressContext";

const DressPage = () => {
  return (
    <>
      <div className="bg-white">
        <main>
          <DressContextProvider>
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
