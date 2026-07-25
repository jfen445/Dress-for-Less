import { GetStaticProps } from "next";
import HomePage from "@/components/HomePage";
import { getAllDressesFromSanity, getFaq } from "../sanity/sanity.query";
import { DressType, Faq } from "../common/types";

const IndexPage = () => {
  return (
    <main className="bg-white">
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
