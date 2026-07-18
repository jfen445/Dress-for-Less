const FeaturedSection = () => {
  return (
    <section aria-labelledby="cause-heading">
      <div className="relative bg-gray-800 px-6 py-32 sm:px-12 sm:py-40 lg:px-16">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gray-900 bg-opacity-50"
        />
        <div className="relative mx-auto flex max-w-3xl flex-col items-center text-center">
          <h2
            id="cause-heading"
            className="text-3xl font-bold tracking-tight text-white sm:text-4xl"
          >
            Dress rentals made easy
          </h2>
          <p className="mt-3 text-xl text-white">
            Whether you&apos;re heading to a school ball, birthday, wedding,
            graduation or formal event, renting has never been easier. Browse
            hundreds of designer dresses, choose your dates, and we&apos;ll
            deliver it straight to your door - or collect from Auckland.
          </p>
          <a
            href={"/faq"}
            className="mt-8 block w-full rounded-md border border-transparent bg-white px-8 py-3 text-base font-medium text-gray-900 hover:bg-gray-100 sm:w-auto"
          >
            How It Works
          </a>
        </div>
      </div>
    </section>
  );
};

export default FeaturedSection;
