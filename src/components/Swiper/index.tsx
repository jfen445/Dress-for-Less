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
  return (
    <>
      {images && (
        <Swiper
          modules={[EffectCoverflow, Pagination]}
          effect={"coverflow"}
          loop={true}
          className={`coverflow ${classname}`}
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
      )}
    </>
  );
};

export default CoverFlow;
