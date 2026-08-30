import * as React from "react";
import { GetStaticProps } from "next";
import DressGrid from "@/components/DressPage/DressGrid";
import Filters from "@/components/DressPage/Filters";
import DressContextProvider, {
  type DressPageResult,
} from "@/context/DressContext";
import Seo from "@/components/Seo";
import { getDressPage } from "../../sanity/sanity.query";
import { parseDressQuery } from "../../lib/dresses/dressQuery";
import { DressType } from "../../common/types";

interface DressPageProps {
  initialPage: DressPageResult;
}

const DressPage = ({ initialPage }: DressPageProps) => {
  return (
    <>
      <Seo
        title="Shop Dresses | Dress for Less"
        description="Browse our full range of designer dresses available to hire — filter by size, style, and occasion. Delivered or ready for pickup across New Zealand."
        path="/dresses"
      />
      <div className="bg-white">
        <main>
          <DressContextProvider initialPage={initialPage}>
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
  // Page one of the default query only. getStaticProps has no access to query
  // params on a static page, so every filtered or deeper URL is fetched
  // client-side from /api/sanity/listing instead — which is also what makes
  // this page cheap: it used to ship the entire catalogue to render 30 cards.
  const page = await getDressPage(parseDressQuery({}));

  return {
    props: {
      initialPage: {
        items: (page.items ?? []) as DressType[],
        total: page.total ?? 0,
      },
    },
    revalidate: 1800,
  };
};
