import * as React from "react";
import Link from "next/link";
import Marquee from "react-fast-marquee";
import { useGlobalContext } from "@/context/GlobalContext";
import { DressType } from "../../../../common/types";

const HeroSection = () => {
  const { allDresses, getHomeScreenDresses } = useGlobalContext();
  const [dresses, setDresses] = React.useState<DressType[]>(
    getHomeScreenDresses()
  );

  React.useEffect(() => {
    setDresses(getHomeScreenDresses());
  }, [allDresses, getHomeScreenDresses]);

  return (
    <>
      <Marquee
        style={
          {
            "background-color": "#881337",
            color: "white",
          } as React.CSSProperties
        }
        speed={30}
        gradientColor="pink"
        autoFill={false}
      >
        {"DRESS FOR LESS IS HERE ".repeat(100)}
      </Marquee>
      {dresses && dresses.length != 0 && (
        <header className="relative overflow-hidden bg-rose-50">
          {/* Hero section */}
          <div className="pb-80 pt-16 sm:pb-40 sm:pt-24 lg:pb-48 lg:pt-40">
            <div className="relative mx-auto max-w-7xl px-4 sm:static sm:px-6 lg:px-8">
              <div className="sm:max-w-lg">
                <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-6xl">
                  Dress for Less has landed here
                </h1>
                <p className="mt-4 text-xl text-gray-500">
                  This year, our new summer collection will shelter you from the
                  harsh elements of a world that does not care if you live or
                  die.
                </p>
              </div>
              <div>
                <div className="mt-10">
                  {/* Decorative image grid */}
                  <div
                    aria-hidden="true"
                    className="pointer-events-none lg:absolute lg:inset-y-0 lg:mx-auto lg:w-full lg:max-w-7xl"
                  >
                    <div className="absolute transform sm:left-1/2 sm:top-0 sm:translate-x-8 lg:left-1/2 lg:top-1/2 lg:-translate-y-1/2 lg:translate-x-8">
                      <div className="flex items-center space-x-6 lg:space-x-8">
                        <div className="grid flex-shrink-0 grid-cols-1 gap-y-6 lg:gap-y-8">
                          <div className="h-64 w-44 overflow-hidden rounded-lg sm:opacity-0 lg:opacity-100">
                            <img
                              src={dresses[0].images[0]}
                              alt=""
                              className="h-full w-full object-cover object-center"
                            />
                          </div>
                          <div className="h-64 w-44 overflow-hidden rounded-lg">
                            <img
                              src={dresses[1].images[0]}
                              alt=""
                              className="h-full w-full object-cover object-center"
                            />
                          </div>
                        </div>
                        <div className="grid flex-shrink-0 grid-cols-1 gap-y-6 lg:gap-y-8">
                          <div className="h-64 w-44 overflow-hidden rounded-lg">
                            <img
                              src={dresses[2].images[0]}
                              alt=""
                              className="h-full w-full object-cover object-center"
                            />
                          </div>
                          <div className="h-64 w-44 overflow-hidden rounded-lg">
                            <img
                              src={dresses[3].images[0]}
                              alt=""
                              className="h-full w-full object-cover object-center"
                            />
                          </div>
                          <div className="h-64 w-44 overflow-hidden rounded-lg">
                            <img
                              src={dresses[4].images[0]}
                              alt=""
                              className="h-full w-full object-cover object-center"
                            />
                          </div>
                        </div>
                        <div className="grid flex-shrink-0 grid-cols-1 gap-y-6 lg:gap-y-8">
                          <div className="h-64 w-44 overflow-hidden rounded-lg">
                            <img
                              src={dresses[5].images[0]}
                              alt=""
                              className="h-full w-full object-cover object-center"
                            />
                          </div>
                          <div className="h-64 w-44 overflow-hidden rounded-lg">
                            <img
                              src={dresses[6].images[0]}
                              alt=""
                              className="h-full w-full object-cover object-center"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <Link
                    href="/dresses"
                    className="inline-block rounded-md border border-transparent bg-primary-pink px-8 py-3 text-center font-medium text-white hover:bg-secondary-pink"
                  >
                    Shop Collection
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </header>
      )}
    </>
  );
};

export default HeroSection;
