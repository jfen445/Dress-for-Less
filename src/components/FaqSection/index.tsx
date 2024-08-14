import React from "react";
import { getFaq } from "../../../sanity/sanity.query";

const faqs = [
  {
    question: "How do you make holy water?",
    answer:
      "You boil the hell out of it. Lorem ipsum dolor sit amet consectetur adipisicing elit. Quas cupiditate laboriosam fugiat.",
  },
  // More questions...
];

type FAQ = {
  _id: string;
  question: string;
  answer: string;
};

const FaqSection = () => {
  const [questions, setQuestions] = React.useState<FAQ[]>([]);

  React.useEffect(() => {
    const getQuestions = async () => {
      await getFaq().then((data) => {
        const qdata = data as unknown as FAQ[];
        setQuestions(qdata);
      });
    };

    getQuestions();
  });
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
          <div className="mt-10 lg:col-span-7 lg:mt-0">
            <dl className="space-y-10">
              {questions.reverse().map((faq) => (
                <div key={faq.question}>
                  <dt className="text-base font-semibold leading-7 text-gray-900">
                    {faq.question}
                  </dt>
                  <dd className="mt-2 text-base leading-7 text-gray-600">
                    {faq.answer}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FaqSection;
