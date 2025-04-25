export type NavigationItem = {
  name: string;
  href: string;
};

export type NavigationSection = {
  id: string;
  name: string;
  items: NavigationItem[];
};

export type NavigationCategory = {
  id: string;
  name: string;
  href: string;
  featured: {
    name: string;
    href: string;
    imageSrc: string;
    imageAlt: string;
  }[];
  sections: NavigationSection[][];
};

export type Navigation = {
  categories: NavigationCategory[];
  pages: NavigationItem[];
};
