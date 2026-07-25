import { defineField } from "sanity";
import { FaqSection } from "../enums/FaqSection";

const faq = {
  name: "faq",
  title: "Frequently Asked Questions",
  type: "document",
  fields: [
    {
      name: "question",
      title: "Question",
      type: "string",
    },
    {
      name: "answer",
      title: "Answer",
      type: "string",
    },
    {
      name: "section",
      title: "Section",
      type: "string",
      options: {
        list: Object.values(FaqSection).map((section) => ({
          title: section,
          value: section,
        })),
        layout: "dropdown",
      },
      validation: (Rule: any) => Rule.required(),
    },
    {
      name: "order",
      title: "Order",
      type: "number",
      description:
        "Controls the order this question appears in on the FAQ page (lower numbers first).",
    },
  ],
};

export default faq;
