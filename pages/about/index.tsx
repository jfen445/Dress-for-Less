import AboutImage from "../../public/aboutimg.jpg";

const incentives = [
  {
    name: "Fast shipping",
    imageSrc:
      "https://tailwindui.com/img/ecommerce/icons/icon-shipping-simple.svg",
    description:
      "It's not actually free we just price it into the products. Someone's paying for it, and it's not us.",
  },
  {
    name: "10-year warranty",
    imageSrc:
      "https://tailwindui.com/img/ecommerce/icons/icon-warranty-simple.svg",
    description:
      "If it breaks in the first 10 years we'll replace it. After that you're on your own though.",
  },
  {
    name: "Exchanges",
    imageSrc:
      "https://tailwindui.com/img/ecommerce/icons/icon-exchange-simple.svg",
    description:
      "If you don't like it, trade it to one of your friends for something of theirs. Don't send it here though.",
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
                Welcome to Dress for Less - Your Go-To Dress Rental Destination
              </h2>
              <p className="mt-4 text-gray-500">
                At Dress for Less, we believe that every occasion deserves the
                perfect dress. Located in the heart of Auckland, we offer an
                exquisite collection of high-quality dresses available for rent
                at affordable prices. Whether you{"'"}re preparing for a
                wedding, a gala, or a night out, our diverse range ensures you
                {"'"}ll find the perfect fit for any event.
              </p>
              <p className="mt-4 text-gray-500">
                We pride ourselves on making luxury accessible, and our easy
                online booking system allows us to cater to customers all across
                New Zealand. Browse our curated collection and let us help you
                shine on your special day—without breaking the bank.
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
          <div className="mt-16 grid grid-cols-1 gap-x-8 gap-y-10 lg:grid-cols-3">
            {incentives.map((incentive) => (
              <div key={incentive.name} className="sm:flex lg:block">
                <div className="sm:flex-shrink-0">
                  <img alt="" src={incentive.imageSrc} className="h-16 w-16" />
                </div>
                <div className="mt-4 sm:ml-6 sm:mt-0 lg:ml-0 lg:mt-6">
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
