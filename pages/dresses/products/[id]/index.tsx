import { GetStaticPaths, GetStaticProps } from "next";
import Product from "@/components/ProductPage";
import Seo from "@/components/Seo";
import { getDress } from "../../../../sanity/sanity.query";
import { DressType } from "../../../../common/types";
import { truncate } from "../../../../lib/utils/seo";

interface ProductPageProps {
  dress: DressType;
}

const ProductPage = ({ dress }: ProductPageProps) => {
  return (
    <div>
      <Seo
        title={`${dress.name} by ${dress.brand} | Dress for Less`}
        description={truncate(dress.description, 155)}
        path={`/dresses/products/${dress._id}`}
        ogImage={dress.images?.[0]}
      />
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
    return { notFound: true };
  }

  return {
    props: { dress },
    revalidate: 3600,
  };
};
