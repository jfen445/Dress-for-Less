import { GetStaticProps } from "next";
import HomePage from "@/components/HomePage";
import Seo from "@/components/Seo";
import { getAllDressesFromSanity, getFaq } from "../sanity/sanity.query";
import { DressType, Faq } from "../common/types";

const IndexPage = () => {
  return (
    <main className="bg-white">
      <Seo
        title="Dress for Less "
        description="Hire designer dresses for weddings, races, and events across New Zealand. Affordable, sustainable dress rental from Dress for Less."
        path="/"
      />
      <HomePage />
    </main>
  );
};
export default IndexPage;

export const getStaticProps: GetStaticProps = async () => {
  const [dresses, faq] = await Promise.all([
    getAllDressesFromSanity() as Promise<DressType[]>,
    getFaq() as Promise<Faq[]>,
  ]);

  return {
    props: { dresses, faq },
    revalidate: 1800,
  };
};
