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
      name: "price",
      title: "Price",
      type: "number",
      description: "Price for the dress",
    },
    {
      name: "rrp",
      title: "RRP",
      type: "number",
      description: "Reatil price for the dress",
    },
    {
      name: "brand",
      title: "Brand",
      type: "string",
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
          { title: "XL", value: "XL" },
          { title: "L", value: "L" },
          { title: "M", value: "M" },
          { title: "S", value: "S" },
          { title: "XS", value: "XS" },
        ],
      },
    },
    {
      name: "recommended_size",
      title: "Recommended Size",
      type: "string",
      initialValue: "",
      options: {
        list: [
          { title: "XL", value: "XL" },
          { title: "L", value: "L" },
          { title: "M", value: "M" },
          { title: "S", value: "S" },
          { title: "XS", value: "XS" },
        ],
      },
    },
    {
      name: "length",
      title: "Length",
      type: "string",
      initialValue: "",
      options: {
        list: [
          { title: "Maxi", value: "Maxi" },
          { title: "Mini", value: "Mini" },
          { title: "Midi", value: "Midi" },
        ],
      },
    },
    {
      name: "stretch",
      title: "Stretch",
      type: "string",
      initialValue: "",
      options: {
        list: [
          { title: "1", value: "1" },
          { title: "2", value: "2" },
          { title: "3", value: "3" },
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
