import { defineField } from "sanity";

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
  ],
};

export default faq;
