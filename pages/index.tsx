import { GetStaticProps } from "next";
import HomePage from "@/components/HomePage";
import Seo from "@/components/Seo";
import { getDressesForListing, getFaq } from "../sanity/sanity.query";
import { DressType, Faq } from "../common/types";

const IndexPage = () => {
  return (
    <main className="bg-white">
      <Seo
        title="Dress for Less"
        description="Hire designer dresses for weddings, races, and events across New Zealand. Affordable, sustainable dress rental from Dress for Less."
        path="/"
      />
      <HomePage />
    </main>
  );
};
export default IndexPage;

// The home page only ever shows 7 hero picks + 3 favourites (both randomized
// client-side after mount — see HeroSection/FavouritesSection), so it doesn't
// need the full catalogue. A small trimmed sample keeps this page's data
// payload light; GlobalContext's existing background fetch upgrades to the
// full dress list moments after mount for anything else that needs it.
const HOME_DRESS_SAMPLE_SIZE = 40;

export const getStaticProps: GetStaticProps = async () => {
  const [dresses, faq] = await Promise.all([
    getDressesForListing(HOME_DRESS_SAMPLE_SIZE) as Promise<DressType[]>,
    getFaq() as Promise<Faq[]>,
  ]);

  return {
    props: { dresses, faq },
    revalidate: 1800,
  };
};
