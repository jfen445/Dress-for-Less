import * as React from "react";
import Image from "next/image";
import { Tab } from "@headlessui/react";
import { ImageType } from "../../../../common/types";
import CoverFlow from "@/components/Swiper";
import { getSanityImageDimensions } from "../../../../lib/utils/image";
import { sizedImageUrl } from "../../../../sanity/lib/image";

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

interface IImageSelector {
  images: ImageType[];
  classname: string;
}

const ImagePanel = ({ image }: { image: ImageType }) => {
  const [loaded, setLoaded] = React.useState(false);
  const { width, height } = getSanityImageDimensions(image.src);

  return (
    <div className="relative flex h-full w-full items-center justify-center">
      {!loaded && (
        <span className="absolute h-10 w-10 animate-spin rounded-full border-2 border-gray-200 border-t-secondary-pink" />
      )}
      <Image
        src={sizedImageUrl(image.src, { width: 1400 })}
        alt={image.alt}
        width={width}
        height={height}
        sizes="(min-width: 1024px) 50vw, 100vw"
        onLoad={() => setLoaded(true)}
        className={classNames(
          "h-full w-auto max-w-full object-contain mx-auto sm:rounded-lg transition-opacity duration-200",
          loaded ? "opacity-100" : "opacity-0",
        )}
      />
    </div>
  );
};

const ImageSelector = ({ images, classname }: IImageSelector) => {
  return (
    <>
      <div className={`my-auto ${classname}`}>
        <Tab.Group as="div" className="flex flex-col-reverse">
          {/* Image selector */}
          <div className="mx-auto mt-6 hidden w-full max-w-2xl sm:block lg:max-w-none">
            <Tab.List
              className={`grid ${
                images ? `grid-cols-${4}` : "grid-cols-4"
              }  gap-6`}
            >
              {images.map((image) => (
                <Tab
                  key={image.alt}
                  className="relative flex h-24 cursor-pointer items-center justify-center rounded-md bg-white text-sm font-medium uppercase text-gray-900 hover:bg-gray-50 focus:outline-none"
                >
                  {({ selected }) => (
                    <>
                      {/* <span className="sr-only">{image.name}</span> */}
                      <span className="absolute inset-0 overflow-hidden rounded-md">
                        <Image
                          src={sizedImageUrl(image.src, { width: 192 })}
                          alt={image.alt}
                          fill
                          sizes="96px"
                          className="h-full w-full object-cover object-center"
                        />
                      </span>
                      <span
                        className={classNames(
                          selected ? "ring-secondary-pink" : "ring-transparent",
                          "pointer-events-none absolute inset-0 rounded-md ring-2 ring-offset-2"
                        )}
                        aria-hidden="true"
                      />
                    </>
                  )}
                </Tab>
              ))}
            </Tab.List>
          </div>

          <Tab.Panels className="w-full mx-auto h-[70vh]">
            {images.map((image) => (
              <Tab.Panel key={image.alt} className="h-full w-full">
                <ImagePanel image={image} />
              </Tab.Panel>
            ))}
          </Tab.Panels>
        </Tab.Group>
      </div>
    </>
  );
};

export default ImageSelector;
