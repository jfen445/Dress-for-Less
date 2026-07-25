import Image from "next/image";
import { Tab } from "@headlessui/react";
import { ImageType } from "../../../../common/types";
import CoverFlow from "@/components/Swiper";
import { getSanityImageDimensions } from "../../../../lib/utils/image";

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

interface IImageSelector {
  images: ImageType[];
  classname: string;
}

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
                          src={image.src}
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

          <Tab.Panels className="aspect-h-1 aspect-w-1 w-full mx-auto">
            {images.map((image) => {
              const { width, height } = getSanityImageDimensions(image.src);

              return (
                <Tab.Panel key={image.alt}>
                  <Image
                    src={image.src}
                    alt={image.alt}
                    width={width}
                    height={height}
                    sizes="(min-width: 1024px) 50vw, 100vw"
                    className="h-96 w-auto mx-auto sm:rounded-lg"
                  />
                </Tab.Panel>
              );
            })}
          </Tab.Panels>
        </Tab.Group>
      </div>
    </>
  );
};

export default ImageSelector;
