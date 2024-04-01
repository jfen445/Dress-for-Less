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

export type DressType = {
  _id: string;
  name: string;
  description: string;
  size: string;
  images: string[];
  tags: { _type: string; label: string; _key: string }[];
};

export type ImageType = {
  src: string;
  alt: string;
};
