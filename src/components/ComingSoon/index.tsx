import AboutImage from "../../../public/aboutimg.jpg";
import DFLLogo from "../../../public/dfl-logo-transparent.jpeg";

const ComingSoon = () => {
  return (
    <div className="bg-white">
      <header className="absolute inset-x-0 top-0 z-50 flex justify-center">
        <img alt="" src={DFLLogo.src} className="mt-8 h-8 w-auto" />
      </header>

      <div className="relative isolate pt-14">
        <div
          aria-hidden="true"
          className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80"
        >
          <div
            style={{
              clipPath:
                "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)",
            }}
            className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-30 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"
          />
        </div>
        <div className="py-24 sm:py-32 lg:pb-40">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h1 className="text-balance text-5xl font-semibold tracking-tight text-gray-900 sm:text-7xl">
                Dress for Less is coming soon
              </h1>
              <p className="mt-8 text-pretty text-lg font-medium text-gray-500 sm:text-xl/8">
                Stay tuned to explore New Zealand&apos;s leading range of rental
                dresses
              </p>

              <div className="mt-10 flex items-center justify-center gap-x-6">
                <a
                  href="https://www.instagram.com/dressforlessnz"
                  target="_blank"
                  className="rounded-md bg-primary-pink px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                >
                  Book through Instagram
                </a>
                <a
                  href="mailto:dressforless@gmail.com"
                  target="_blank"
                  className="text-sm/6 font-semibold text-gray-900"
                >
                  Contact us <span aria-hidden="true">→</span>
                </a>
              </div>
            </div>
            <div className="mt-16 flow-root sm:mt-24">
              <div className="-m-2 rounded-xl bg-gray-900/5 p-2 ring-1 ring-inset ring-gray-900/10 lg:-m-4 lg:rounded-2xl lg:p-4">
                <img
                  alt="App screenshot"
                  src={AboutImage.src}
                  width={2432}
                  height={1442}
                  className="rounded-md shadow-2xl ring-1 ring-gray-900/10"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComingSoon;
