import { defineArrayMember, defineField } from "sanity";

const dresssize = {
  name: "dresssize",
  title: "Dress Size",
  type: "document",
  fields: [
    {
      name: "XS",
      title: "XS",
      type: "number",
    },
    {
      name: "S",
      title: "S",
      type: "number",
    },
  ],
};

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
      description: "Retail price for the dress",
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
      name: "xs",
      title: "XS",
      type: "number",
      description: "Quantity of XS sized dresses",
      defaultValue: 0,
    },
    {
      name: "s",
      title: "S",
      type: "number",
      description: "Quantity of S sized dresses",
      defaultValue: 0,
    },
    {
      name: "m",
      title: "M",
      type: "number",
      description: "Quantity of M sized dresses",
      defaultValue: 0,
    },
    {
      name: "l",
      title: "L",
      type: "number",
      description: "Quantity of L sized dresses",
      defaultValue: 0,
    },
    {
      name: "xl",
      title: "XL",
      type: "number",
      description: "Quantity of XL sized dresses",
      defaultValue: 0,
    },
    {
      name: "recommendedSize",
      title: "Recommended Size",
      type: "array",
      of: [
        {
          type: "string",
        },
      ],
      options: {
        list: [
          { title: "XL", value: "XL" },
          { title: "L", value: "L" },
          { title: "M", value: "M" },
          { title: "S", value: "S" },
          { title: "XS", value: "XS" },
        ],
        layout: "grid",
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
      name: "condition",
      title: "Condition",
      type: "string",
    },
    {
      name: "rating",
      title: "Rating",
      type: "number",
      validation: (rule: {
        min: (arg0: number) => {
          (): any;
          new (): any;
          max: { (arg0: number): any; new (): any };
        };
      }) => rule.min(0).max(3),
    },
    {
      name: "tags",
      type: "array",
      title: "Tags for item",
      of: [
        defineArrayMember({
          type: "object",
          name: "tag",
          fields: [{ type: "string", name: "tag" }],
        }),
      ],
    },
  ],
};

export default dress;
