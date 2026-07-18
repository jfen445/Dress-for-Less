import React from "react";
import { useGlobalContext } from "@/context/GlobalContext";
import { FaqSection as FaqSectionEnum } from "../../../common/enums/FaqSection";

const SECTION_ORDER = Object.values(FaqSectionEnum);

const FaqSection = () => {
  const { faq } = useGlobalContext();

  const groupedFaq = React.useMemo(() => {
    const groups = new Map<string, typeof faq>();

    for (const f of [...faq].reverse()) {
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
                <dl className="mt-6 space-y-10">
                  {items.map((f) => (
                    <div key={f._id ?? f.question}>
                      <dt className="text-base font-semibold leading-7 text-gray-900">
                        {f.question}
                      </dt>
                      <dd className="mt-2 text-base leading-7 text-gray-600">
                        {f.answer}
                      </dd>
                    </div>
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
