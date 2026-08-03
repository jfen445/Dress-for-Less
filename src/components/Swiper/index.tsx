import * as React from "react";
import Image from "next/image";

import { EffectCoverflow, Pagination } from "swiper";
import { Swiper, SwiperSlide } from "swiper/react";

import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import "swiper/css/scrollbar";
import "swiper/css/thumbs";
import "swiper/css/effect-coverflow";
import "swiper/css/mousewheel";
import "swiper/css/autoplay";
import "swiper/css/effect-fade";
import "swiper/css/grid";
import { ImageType } from "../../../common/types";
import { getSanityImageDimensions } from "../../../lib/utils/image";
import { sizedImageUrl } from "../../../sanity/lib/image";

interface ICoverFlow {
  images: ImageType[];
  classname: string;
}

const CoverFlow = ({ images, classname }: ICoverFlow) => {
  const [activeIndex, setActiveIndex] = React.useState(0);
  const swiperRef = React.useRef<any>(null);

  return (
    <>
      {images && (
        <div className={classname}>
          <Swiper
            modules={[EffectCoverflow, Pagination]}
            effect={"coverflow"}
            loop={true}
            onSwiper={(swiper) => {
              swiperRef.current = swiper;
            }}
            onSlideChange={(swiper) => setActiveIndex(swiper.realIndex)}
            className="coverflow"
          >
            {images.map((image, index) => {
              const { width, height } = getSanityImageDimensions(image.src);

              return (
                <SwiperSlide key={index}>
                  <Image
                    src={sizedImageUrl(image.src, { width: 800 })}
                    alt={image.alt}
                    width={width}
                    height={height}
                    sizes="(min-width: 640px) 320px, 100vw"
                    className="h-[60vh] w-auto mx-auto object-cover object-center rounded-lg my-10"
                  />
                </SwiperSlide>
              );
            })}
          </Swiper>

          {images.length > 1 && (
            <div className="flex justify-center gap-2 overflow-x-auto px-4 pt-2 pb-2">
              {images.map((image, index) => (
                <button
                  key={image.alt + index}
                  type="button"
                  onClick={() => swiperRef.current?.slideToLoop(index)}
                  className={`relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-md ring-2 ring-offset-2 ${
                    activeIndex === index
                      ? "ring-secondary-pink"
                      : "ring-transparent"
                  }`}
                >
                  <Image
                    src={sizedImageUrl(image.src, { width: 128 })}
                    alt={image.alt}
                    fill
                    sizes="64px"
                    className="object-cover object-center"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default CoverFlow;
