import * as React from "react";

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
            return (
              <SwiperSlide key={index}>
                <img
                  src={image.src}
                  alt=""
                  className="h-[60vh] mx-auto object-cover object-center rounded-lg my-10"
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
