import { defineArrayMember, defineField } from "sanity";

const dress = {
  name: "dress",
  title: "Dress",
  type: "document",
  fields: [
    defineField({
      name: "name",
      title: "Name",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    {
      name: "description",
      title: "Description",
      type: "string",
      description: "Give a description for the dress",
    },
    {
      name: "images",
      title: "Images",
      type: "array",
      of: [{ type: "image" }],
      options: {
        layout: "grid",
      },
    },
    {
      name: "size",
      title: "Size",
      type: "string",
      initialValue: "",
      options: {
        list: [
          { title: "XL", value: "xl" },
          { title: "L", value: "l" },
          { title: "M", value: "m" },
          { title: "S", value: "s" },
          { title: "XS", value: "xs" },
        ],
      },
    },
    {
      name: "tags",
      type: "array",
      title: "Tags for item",
      of: [
        defineArrayMember({
          type: "object",
          name: "tag",
          fields: [
            { type: "string", name: "label" },
            { type: "string", name: "value" },
          ],
        }),
      ],
    },
  ],
};

export default dress;
