import AboutImage from "../../public/about.jpg";
import {
  TruckIcon,
  SparklesIcon,
  MapPinIcon,
} from "@heroicons/react/24/outline";

const incentives = [
  {
    name: "NZ wide postage",
    description: "Fast and reliable delivery.",
    icon: TruckIcon,
  },
  {
    name: "500+ designer dresses",
    description: "New styles every week.",
    icon: SparklesIcon,
  },
  {
    name: "Auckland try ons",
    description: "Pick-up available.",
    icon: MapPinIcon,
  },
];

const AboutPage = () => {
  return (
    <div className="bg-rose-50 min-h-screen">
      <div className="mx-auto max-w-7xl py-24 sm:px-2 sm:py-32 lg:px-4">
        <div className="mx-auto max-w-2xl px-4 lg:max-w-none">
          <div className="grid grid-cols-1 items-center gap-x-16 gap-y-10 lg:grid-cols-2">
            <div>
              <h2 className="text-4xl font-bold tracking-tight text-gray-900">
                Our Story
              </h2>
              <p className="mt-4 text-gray-500">
                Founded in 2021, Dress for Less was created to make designer
                fashion more affordable, accessible and sustainable.
              </p>
              <p className="mt-4 text-gray-500">
                What began on Instagram with a small collection of dresses
                has grown into hundreds of rentals available across New
                Zealand. In 2026, we launched our website to make booking
                your perfect dress even easier.
              </p>
              <p className="mt-4 text-gray-500">
                Beyond dress rentals, we’re passionate about giving back to
                our community through our annual Pink Ribbon Breakfasts,
                raising funds and awareness for Breast Cancer Foundation NZ
                (the photo to the right is from our last event!)
              </p>
              <p className="mt-4 text-gray-500">
                Thank you for supporting our small business - we’re excited
                to help you find the perfect dress for your next special
                occasion.
              </p>
            </div>
            <div className="aspect-h-2 aspect-w-3 overflow-hidden rounded-lg bg-gray-100">
              <img
                alt=""
                src={AboutImage.src}
                className="object-cover object-center"
              />
            </div>
          </div>

          <div className="mt-16 grid grid-cols-1 gap-x-8 gap-y-10 lg:grid-cols-3 lg:divide-x lg:divide-rose-200">
            {incentives.map((incentive) => (
              <div
                key={incentive.name}
                className="text-center lg:px-8 first:lg:pl-0 last:lg:pr-0"
              >
                <incentive.icon
                  aria-hidden="true"
                  className="mx-auto h-8 w-8 text-rose-400"
                />
                <div className="mt-4">
                  <h3 className="text-sm font-medium text-gray-900">
                    {incentive.name}
                  </h3>
                  <p className="mt-2 text-sm text-gray-500">
                    {incentive.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutPage;
