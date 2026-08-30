"use client";

import { JSX } from "react";
import HeroSection from "./HeroSection";
import FeaturedSection from "./FeaturedSection";
import FavouritesSection from "./FavouritesSection";
import { DressType } from "../../../common/types";

interface HomePageProps {
  heroPool: DressType[];
  favourites: DressType[];
}

const HomePage: (props: HomePageProps) => JSX.Element = ({
  heroPool,
  favourites,
}) => {
  return (
    <div>
      <HeroSection pool={heroPool} />

      <main>
        {/* Featured section */}
        <FeaturedSection />

        {/* Favorites section */}
        <FavouritesSection dresses={favourites} />

        {/* CTA section */}
        {/* <SaleSection /> */}
      </main>
    </div>
  );
};

export default HomePage;
