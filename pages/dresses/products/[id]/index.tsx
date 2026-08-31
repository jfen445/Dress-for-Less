import { GetStaticPaths, GetStaticProps } from "next";
import Head from "next/head";
import Product from "@/components/ProductPage";
import Seo from "@/components/Seo";
import { getDress } from "../../../../sanity/sanity.query";
import { DressType } from "../../../../common/types";
import { absoluteUrl, buildProductJsonLd, truncate } from "../../../../lib/utils/seo";

interface ProductPageProps {
  dress: DressType;
}

const ProductPage = ({ dress }: ProductPageProps) => {
  const path = `/dresses/products/${dress._id}`;
  const jsonLd = buildProductJsonLd(dress, absoluteUrl(path));

  return (
    <div>
      <Seo
        title={`${dress.name} by ${dress.brand} | Dress for Less`}
        description={truncate(dress.description, 155)}
        path={path}
        ogImage={dress.images?.[0]}
      />
      <Head>
        <script
          key="product-jsonld"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </Head>
      <Product dress={dress} />
    </div>
  );
};

export default ProductPage;

export const getStaticPaths: GetStaticPaths = async () => {
  // No paths are pre-built at deploy time — with several hundred dresses,
  // prerendering all of them on every deploy is wasted build time given
  // ISR already refreshes each page hourly. Pages are generated on first
  // request instead (crawlers/visitors hitting a URL trigger it), then
  // cached and served statically from then on.
  return {
    paths: [],
    fallback: "blocking",
  };
};

export const getStaticProps: GetStaticProps<ProductPageProps> = async ({
  params,
}) => {
  const id = params?.id as string;
  const dress = (await getDress(id)) as DressType | null;

  if (!dress) {
    // A notFound without `revalidate` is cached until the next deploy, so a
    // transient miss (Sanity blip, a dress briefly unpublished) would pin a real
    // product page at 404 indefinitely — silently, since a cached 404 logs
    // nothing. Longer than a minute so crawlers hitting junk ids don't re-query
    // Sanity on every pass.
    return { notFound: true, revalidate: 300 };
  }

  return {
    props: { dress },
    revalidate: 3600,
  };
};
