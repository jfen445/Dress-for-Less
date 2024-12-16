import { Tab } from "@headlessui/react";
import { ImageType } from "../../../../common/types";

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

const ImageSelector = (props: { images: ImageType[] }) => {
  return (
    <>
      <div className="my-auto">
        <Tab.Group as="div" className="flex flex-col-reverse">
          {/* Image selector */}
          <div className="mx-auto mt-6 hidden w-full max-w-2xl sm:block lg:max-w-none">
            <Tab.List
              className={`grid ${
                props.images
                  ? `grid-cols-${props.images.length}`
                  : "grid-cols-4"
              }  gap-6`}
            >
              {props.images.map((image) => (
                <Tab
                  key={image.alt}
                  className="relative flex h-24 cursor-pointer items-center justify-center rounded-md bg-white text-sm font-medium uppercase text-gray-900 hover:bg-gray-50 focus:outline-none focus:ring focus:ring-opacity-50 focus:ring-offset-4"
                >
                  {({ selected }) => (
                    <>
                      {/* <span className="sr-only">{image.name}</span> */}
                      <span className="absolute inset-0 overflow-hidden rounded-md">
                        <img
                          src={image.src}
                          alt=""
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
            {props.images.map((image) => (
              <Tab.Panel key={image.alt}>
                <img
                  src={image.src}
                  alt={image.alt}
                  className="h-96 mx-auto object-cover object-center sm:rounded-lg"
                />
              </Tab.Panel>
            ))}
          </Tab.Panels>
        </Tab.Group>
      </div>
    </>
  );
};

export default ImageSelector;
