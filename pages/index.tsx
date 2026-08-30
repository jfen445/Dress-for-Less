import { GetStaticProps } from "next";
import HomePage from "@/components/HomePage";
import Seo from "@/components/Seo";
import {
  getDressCount,
  getDressPage,
  getHeroPool,
} from "../sanity/sanity.query";
import { parseDressQuery } from "../lib/dresses/dressQuery";
import { DressType } from "../common/types";

interface HomeProps {
  heroPool: DressType[];
  favourites: DressType[];
}

const IndexPage = ({ heroPool, favourites }: HomeProps) => {
  return (
    <main className="bg-white">
      <Seo
        title="Dress for Less"
        description="Hire designer dresses for weddings, races, and events across New Zealand. Affordable, sustainable dress rental from Dress for Less."
        path="/"
      />
      <HomePage heroPool={heroPool} favourites={favourites} />
    </main>
  );
};
export default IndexPage;

// The hero shows 7 tiles and rotates one at a time; 60 is far more than a
// single visit gets through, and each entry is only an id and one image URL.
const HERO_POOL_SIZE = 60;
const FAVOURITES_SAMPLE_SIZE = 12;

/** A random window start, so the sample moves between ISR regenerations. */
const randomOffset = (total: number, windowSize: number) =>
  total > windowSize ? Math.floor(Math.random() * (total - windowSize)) : 0;

export const getStaticProps: GetStaticProps<HomeProps> = async () => {
  // Both samples are drawn from a *moving* window. The home page used to take
  // a fixed [0...40] with no order clause, which is the same 40 dresses on
  // every regeneration forever — it only ever looked varied because the whole
  // catalogue was being fetched over the top of it on the client.
  const total = await getDressCount();

  const favouritesPages = Math.max(1, Math.floor(total / FAVOURITES_SAMPLE_SIZE));

  const [heroPool, favourites] = await Promise.all([
    getHeroPool(HERO_POOL_SIZE, randomOffset(total, HERO_POOL_SIZE)) as Promise<
      DressType[]
    >,
    getDressPage(
      parseDressQuery({
        page: String(Math.floor(Math.random() * favouritesPages) + 1),
        pageSize: String(FAVOURITES_SAMPLE_SIZE),
      }),
    ),
  ]);

  // No FAQ here: nothing on this page renders it, and GlobalContext fetches it
  // on mount anyway, so shipping it in __NEXT_DATA__ was pure weight.
  return {
    props: {
      heroPool: heroPool ?? [],
      favourites: (favourites.items ?? []) as DressType[],
    },
    revalidate: 1800,
  };
};
