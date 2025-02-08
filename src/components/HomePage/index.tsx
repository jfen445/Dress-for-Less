"use client";

import { JSX, useState } from "react";
import HeroSection from "./HeroSection";
import FeaturedSection from "./FeaturedSection";
import FavouritesSection from "./FavouritesSection";
import { sanityFetch } from "../../../sanity/sanity.client";

const HomePage: () => JSX.Element = () => {
  return (
    <div>
      <HeroSection />

      <main>
        {/* Featured section */}
        <FeaturedSection />

        {/* Favorites section */}
        <FavouritesSection />

        {/* CTA section */}
        {/* <SaleSection /> */}
      </main>
    </div>
  );
};

export default HomePage;
