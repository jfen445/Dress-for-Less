import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import Marquee from "react-fast-marquee";
import { useGlobalContext } from "@/context/GlobalContext";
import { DressType } from "../../../../common/types";
import { sizedImageUrl } from "../../../../sanity/lib/image";

const HERO_IMAGE_COUNT = 7;
const ROTATE_INTERVAL_MS = 10000;
// Firing one slot change every (ROTATE_INTERVAL_MS / 7)ms and stepping
// through the slots means each individual slot still only changes once per
// ROTATE_INTERVAL_MS, but they cascade one at a time instead of all
// flipping together.
const STAGGER_MS = ROTATE_INTERVAL_MS / HERO_IMAGE_COUNT;

// Two different dresses (e.g. colour variants of the same style) can share
// the same photo — picking naively by index could show that image twice in
// the grid, so this walks the list keeping only the first dress per image.
const getDressesWithUniqueImages = (
  source: DressType[],
  count: number,
): DressType[] => {
  const seenImages = new Set<string>();
  const result: DressType[] = [];

  for (const dress of source) {
    const image = dress.images?.[0];
    if (!image || seenImages.has(image)) continue;
    seenImages.add(image);
    result.push(dress);
    if (result.length === count) break;
  }

  return result;
};

const HeroSection = () => {
  const { allDresses, getHomeScreenDresses } = useGlobalContext();
  // Deterministic (unshuffled) on the first render so server and client agree —
  // getHomeScreenDresses() shuffles with Math.random(), which would otherwise
  // pick a different order server-side vs client-side and trigger a hydration
  // mismatch. The effect below applies the actual random shuffle post-mount.
  const [dresses, setDresses] = React.useState<DressType[]>(
    getDressesWithUniqueImages(allDresses, HERO_IMAGE_COUNT),
  );

  // Extra unique-image dresses beyond the 7 currently on screen, used as a
  // pool to rotate slots into over time. Kept in a ref (not state) since
  // updating it shouldn't itself trigger a re-render.
  const poolRef = React.useRef<DressType[]>([]);
  const nextPoolIndexRef = React.useRef(HERO_IMAGE_COUNT);
  // Shuffled queue of slot indices still to change this cycle — reshuffled
  // each time it empties, so every slot still changes exactly once per
  // cycle, but which one goes next is randomised each time.
  const slotQueueRef = React.useRef<number[]>([]);

  const drawNextSlot = () => {
    if (slotQueueRef.current.length === 0) {
      const order = Array.from({ length: HERO_IMAGE_COUNT }, (_, i) => i);
      for (let i = order.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [order[i], order[j]] = [order[j], order[i]];
      }
      slotQueueRef.current = order;
    }
    return slotQueueRef.current.pop() as number;
  };

  React.useEffect(() => {
    // Shuffle the full list first, then dedupe — slicing to 7 before
    // deduping would waste unique images sitting later in the shuffle.
    const shuffled = getDressesWithUniqueImages(
      getHomeScreenDresses(allDresses.length),
      allDresses.length,
    );
    poolRef.current = shuffled;
    nextPoolIndexRef.current = HERO_IMAGE_COUNT;
    slotQueueRef.current = [];
    // Only replace the visible images the first time real data arrives —
    // once the initial 7 are on screen, swapping them all at once for a
    // freshly-shuffled set reads as a glitch. After that, slots only change
    // one at a time via the rotation interval below.
    setDresses((prev) =>
      prev.length === 0 ? shuffled.slice(0, HERO_IMAGE_COUNT) : prev,
    );
  }, [allDresses, getHomeScreenDresses]);

  React.useEffect(() => {
    const id = setInterval(() => {
      const pool = poolRef.current;
      // Not enough spare dresses to rotate into without repeating one
      // that's already visible in another slot.
      if (pool.length <= HERO_IMAGE_COUNT) return;

      const slot = drawNextSlot();
      const nextDress = pool[nextPoolIndexRef.current % pool.length];
      nextPoolIndexRef.current += 1;

      setDresses((prev) => {
        if (prev.length < HERO_IMAGE_COUNT) return prev;
        const next = [...prev];
        next[slot] = nextDress;
        return next;
      });
    }, STAGGER_MS);

    return () => clearInterval(id);
  }, []);

  return (
    <>
      <Marquee
        style={
          {
            backgroundColor: "#881337",
            color: "white",
            padding: "16px 0",
            whiteSpace: "pre",
          } as React.CSSProperties
        }
        speed={30}
        gradientColor="pink"
        autoFill={false}
      >
        {"Auckland Pick-Up     ♡     Postage NZ-Wide     ♡     Postage closes Tuesday 8pm for the weekend     ♡     ".repeat(
          100,
        )}
      </Marquee>
      {dresses && dresses.length != 0 && (
        <header className="relative overflow-hidden bg-rose-50">
          {/* Hero section */}
          <div className="pb-80 pt-16 sm:pb-40 sm:pt-24 lg:pb-48 lg:pt-40">
            <div className="relative mx-auto max-w-7xl px-4 sm:static sm:px-6 lg:px-8">
              <div className="sm:max-w-lg">
                <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-6xl">
                  Designer dress rentals, made affordable.
                </h1>
                <p className="mt-4 text-xl text-gray-500">
                  Hire your dream dress for a fraction of the retail price.
                  Whether it&apos;s a ball, birthday, wedding, formal or special
                  event, we&apos;ve got hundreds of designer dresses ready to
                  rent across New Zealand.
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
                          <div className="relative h-64 w-44 overflow-hidden rounded-lg sm:opacity-0 lg:opacity-100">
                            <Image
                              src={sizedImageUrl(dresses[0].images[0], {
                                width: 352,
                              })}
                              alt=""
                              fill
                              sizes="176px"
                              priority
                              className="object-cover object-center"
                            />
                          </div>
                          <div className="relative h-64 w-44 overflow-hidden rounded-lg">
                            <Image
                              src={sizedImageUrl(dresses[1].images[0], {
                                width: 352,
                              })}
                              alt=""
                              fill
                              sizes="176px"
                              priority
                              className="object-cover object-center"
                            />
                          </div>
                        </div>
                        <div className="grid flex-shrink-0 grid-cols-1 gap-y-6 lg:gap-y-8">
                          <div className="relative h-64 w-44 overflow-hidden rounded-lg">
                            <Image
                              src={sizedImageUrl(dresses[2].images[0], {
                                width: 352,
                              })}
                              alt=""
                              fill
                              sizes="176px"
                              priority
                              className="object-cover object-center"
                            />
                          </div>
                          <div className="relative h-64 w-44 overflow-hidden rounded-lg">
                            <Image
                              src={sizedImageUrl(dresses[3].images[0], {
                                width: 352,
                              })}
                              alt=""
                              fill
                              sizes="176px"
                              priority
                              className="object-cover object-center"
                            />
                          </div>
                          <div className="relative h-64 w-44 overflow-hidden rounded-lg">
                            <Image
                              src={sizedImageUrl(dresses[4].images[0], {
                                width: 352,
                              })}
                              alt=""
                              fill
                              sizes="176px"
                              priority
                              className="object-cover object-center"
                            />
                          </div>
                        </div>
                        <div className="grid flex-shrink-0 grid-cols-1 gap-y-6 lg:gap-y-8">
                          <div className="relative h-64 w-44 overflow-hidden rounded-lg">
                            <Image
                              src={sizedImageUrl(dresses[5].images[0], {
                                width: 352,
                              })}
                              alt=""
                              fill
                              sizes="176px"
                              priority
                              className="object-cover object-center"
                            />
                          </div>
                          <div className="relative h-64 w-44 overflow-hidden rounded-lg">
                            <Image
                              src={sizedImageUrl(dresses[6].images[0], {
                                width: 352,
                              })}
                              alt=""
                              fill
                              sizes="176px"
                              priority
                              className="object-cover object-center"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <Link
                    href="/dresses"
                    className="inline-block rounded-md border border-transparent bg-primary-pink px-8 py-3 text-center font-semibold text-white hover:bg-secondary-pink"
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
