import { PortableTextBlock } from "sanity";

export type ProfileType = {
  _id: string;
  fullName: string;
  headline: string;
  profileImage: {
    alt: string;
    image: string;
  };
  shortBio: string;
  email: string;
  fullBio: PortableTextBlock[];
  location: string;
  resumeURL: string;
  socialLinks: string[];
  skills: string[];
};

export type UserType = {
  _id?: string;
  name: string;
  email: string;
  password?: string;
  mobileNumber: string;
  instagramHandle?: string;
};

export type DressType = {
  _id: string;
  name: string;
  description: string;
  size: string;
  images: string[];
  tags: { _type: string; label: string; _key: string }[];
  price: string;
  length: string;
  brand: string;
  rrp: string;
  stretch: string;
};

export type ImageType = {
  src: string;
  alt: string;
};

export type User = {
  email: string;
  name: string;
};

export type CartType = {
  _id?: string;
  dressId: string;
  userId: string;
  dateBooked: string;
};

export type CartItemType = {
  _id: string;
  name: string;
  description: string;
  size: string;
  images: string[];
  tags: { _type: string; label: string; _key: string }[];
  price: string;
  length: string;
  brand: string;
  rrp: string;
  stretch: string;
  dateBooked: string;
  cartItemId: string;
};
