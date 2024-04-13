/*
  This example requires some changes to your config:
  
  ```
  // tailwind.config.js
  module.exports = {
    // ...
    plugins: [
      // ...
      require('@tailwindcss/forms'),
      require('@tailwindcss/aspect-ratio'),
    ],
  }
  ```
*/

"use client";

import { JSX, useState } from "react";
import HeroSection from "./HeroSection";
import FeaturedSection from "./FeaturedSection";
import FavouritesSection from "./FavouritesSection";
import SaleSection from "./SaleSection";

const HomePage: () => JSX.Element = () => {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <HeroSection />

      <main>
        {/* Featured section */}
        <FeaturedSection />

        {/* Favorites section */}
        <FavouritesSection />

        {/* CTA section */}
        <SaleSection />
      </main>
    </div>
  );
};

export default HomePage;
