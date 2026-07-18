import React from "react";
import { Disclosure, DisclosureButton, DisclosurePanel } from "@headlessui/react";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import { useGlobalContext } from "@/context/GlobalContext";
import { FaqSection as FaqSectionEnum } from "../../../common/enums/FaqSection";

const SECTION_ORDER = Object.values(FaqSectionEnum);

const FaqSection = () => {
  const { faq } = useGlobalContext();

  const groupedFaq = React.useMemo(() => {
    const groups = new Map<string, typeof faq>();

    for (const f of faq) {
      const section = f.section ?? FaqSectionEnum.General;
      groups.set(section, [...(groups.get(section) ?? []), f]);
    }

    return SECTION_ORDER.filter((section) => groups.has(section)).map(
      (section) => ({ section, items: groups.get(section)! }),
    );
  }, [faq]);

  return (
    <div className="bg-white">
      <div className="mx-auto max-w-7xl px-6 py-16 sm:pt-32 lg:px-8 lg:py-16">
        <div className="lg:grid lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-5">
            <h2 className="text-2xl font-bold leading-10 tracking-tight text-gray-900">
              Frequently asked questions
            </h2>
            <p className="mt-4 text-base leading-7 text-gray-600">
              Can’t find the answer you’re looking for? Reach out to us directly
              via{" "}
              <a
                href="#mailto:dressforless@gmail.com"
                target="_blank"
                className="font-semibold text-secondary-pink hover:text-indigo-500"
              >
                email
              </a>{" "}
              .
            </p>
          </div>
          <div className="mt-10 lg:col-span-7 lg:mt-0 space-y-12">
            {groupedFaq.map(({ section, items }) => (
              <div key={section}>
                <h3 className="text-lg font-semibold leading-7 text-secondary-pink">
                  {section}
                </h3>
                <dl className="mt-6 space-y-6 divide-y divide-gray-100">
                  {items.map((f) => (
                    <Disclosure as="div" key={f._id ?? f.question} className="pt-6 first:pt-0">
                      {({ open }) => (
                        <>
                          <dt>
                            <DisclosureButton className="flex w-full items-start justify-between gap-6 text-left">
                              <span className="text-base font-semibold leading-7 text-gray-900">
                                {f.question}
                              </span>
                              <span className="flex h-7 items-center">
                                <ChevronDownIcon
                                  aria-hidden="true"
                                  className={`size-5 transition-transform duration-200 ${
                                    open ? "rotate-180" : "rotate-0"
                                  }`}
                                />
                              </span>
                            </DisclosureButton>
                          </dt>
                          <DisclosurePanel
                            as="dd"
                            static
                            className={`grid overflow-hidden transition-all duration-300 ease-in-out ${
                              open ? "mt-2 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                            }`}
                          >
                            <div className="overflow-hidden">
                              <p className="text-base leading-7 text-gray-600">
                                {f.answer}
                              </p>
                            </div>
                          </DisclosurePanel>
                        </>
                      )}
                    </Disclosure>
                  ))}
                </dl>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FaqSection;
