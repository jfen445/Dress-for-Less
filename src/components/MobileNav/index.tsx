"use client";

import { useNavigationContext } from "@/context/NavigationContext";
import { Dialog, Tab, Transition } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/16/solid";
import { Fragment, useState } from "react";

const navigation = {
  categories: [
    {
      id: "women",
      name: "Dress for Less",
      featured: [
        {
          name: "New Arrivals",
          href: "#",
          imageSrc:
            "https://tailwindui.com/img/ecommerce-images/mega-menu-category-01.jpg",
          imageAlt:
            "Models sitting back to back, wearing Basic Tee in black and bone.",
        },
        {
          name: "Basic Tees",
          href: "#",
          imageSrc:
            "https://tailwindui.com/img/ecommerce-images/mega-menu-category-02.jpg",
          imageAlt:
            "Close up of Basic Tee fall bundle with off-white, ochre, olive, and black tees.",
        },
      ],
      sections: [
        {
          id: "dresses",
          name: "Dresses",
          items: [
            {
              name: "Our favourites",
              href: "/dresses?filter=customer_faves&filter=trending_now",
            },
          ],
        },
      ],
    },
    {
      id: "filters",
      name: "Filters",
      featured: [],
      sections: [
        {
          id: "trends",
          name: "Our Favourites",
          items: [
            { name: "Trending Now", href: "trending_now" },
            { name: "New Arrivals", href: "new_arrivals" },
            { name: "Customer Faves", href: "customer_faves" },
          ],
        },
        {
          id: "style",
          name: "Styles",
          items: [
            { name: "Mini", href: "mini" },
            { name: "Midi", href: "midi" },
            { name: "Maxi", href: "maxi" },
            { name: "Sets", href: "sets" },
            { name: "Off-the-Shoulder", href: "off_the_shoulder" },
            { name: "Sleeveless", href: "sleeveless" },
            { name: "Short sleeve", href: "short_sleeve" },
            { name: "Long sleeve", href: "long_sleeve" },
            { name: "Strapless", href: "strapless" },
          ],
        },
        {
          id: "occasion",
          name: "Occasion",
          items: [
            { name: "Birthday", href: "birthday" },
            { name: "Wedding Guest", href: "wedding_guest" },
            { name: "Cocktail", href: "cocktail" },
            { name: "Day Events", href: "day_events" },
            { name: "Ball", href: "ball" },
            { name: "Graduation", href: "graduation" },
            { name: "Black Tie", href: "black_tie" },
            { name: "Festival", href: "festival" },
            { name: "Holiday", href: "holiday" },
            { name: "Race Day", href: "race_day" },
          ],
        },
        {
          id: "color",
          name: "Color",
          items: [
            { name: "Black", href: "black" },
            { name: "White", href: "white" },
            { name: "Red", href: "red" },
            { name: "Orange", href: "orange" },
            { name: "Yellow", href: "yellow" },
            { name: "Green", href: "green" },
            { name: "Blue", href: "blue" },
            { name: "Purple", href: "purple" },
            { name: "Pink", href: "pink" },
            { name: "Grey", href: "grey" },
            { name: "Brown", href: "brown" },
            { name: "Multicolour", href: "multicolour" },
          ],
        },
      ],
    },
  ],
  pages: [
    { name: "FAQ", href: "/faq" },
    { name: "Policy", href: "/policies" },
  ],
};

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

const MobileNav = () => {
  const { mobileNavOpen, setMobileNavOpen } = useNavigationContext();

  return (
    <Transition.Root show={mobileNavOpen} as={Fragment}>
      <Dialog
        as="div"
        className="relative z-40 lg:hidden"
        onClose={setMobileNavOpen}
      >
        <Transition.Child
          as={Fragment}
          enter="transition-opacity ease-linear duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="transition-opacity ease-linear duration-300"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 z-40 flex">
          <Transition.Child
            as={Fragment}
            enter="transition ease-in-out duration-300 transform"
            enterFrom="-translate-x-full"
            enterTo="translate-x-0"
            leave="transition ease-in-out duration-300 transform"
            leaveFrom="translate-x-0"
            leaveTo="-translate-x-full"
          >
            <Dialog.Panel className="relative flex w-full max-w-xs flex-col overflow-y-auto bg-white pb-12 shadow-xl">
              <div className="flex px-4 pb-2 pt-5">
                <button
                  type="button"
                  className="relative -m-2 inline-flex items-center justify-center rounded-md p-2 text-gray-400"
                  onClick={() => setMobileNavOpen(false)}
                >
                  <span className="absolute -inset-0.5" />
                  <span className="sr-only">Close menu</span>
                  <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                </button>
              </div>

              {/* Links */}
              <Tab.Group as="div" className="mt-2">
                <div className="border-b border-gray-200">
                  <Tab.List className="-mb-px flex space-x-8 px-4">
                    {navigation.categories.map((category) => (
                      <Tab
                        key={category.name}
                        className={({ selected }) =>
                          classNames(
                            selected
                              ? "border-secondary-pink text-secondary-pink"
                              : "border-transparent text-gray-900",
                            "flex-1 whitespace-nowrap border-b-2 px-1 py-4 text-base font-medium"
                          )
                        }
                      >
                        {category.name}
                      </Tab>
                    ))}
                  </Tab.List>
                </div>
                <Tab.Panels as={Fragment}>
                  {navigation.categories.map((category) => (
                    <Tab.Panel
                      key={category.name}
                      className="space-y-10 px-4 pb-8 pt-10"
                    >
                      {/* <div className="grid grid-cols-2 gap-x-4">
                        {category.featured.map((item) => (
                          <div
                            key={item.name}
                            className="group relative text-sm"
                          >
                            <div className="aspect-h-1 aspect-w-1 overflow-hidden rounded-lg bg-gray-100 group-hover:opacity-75">
                              <img
                                src={item.imageSrc}
                                alt={item.imageAlt}
                                className="object-cover object-center"
                              />
                            </div>
                            <a
                              href={item.href}
                              className="mt-6 block font-medium text-gray-900"
                            >
                              <span
                                className="absolute inset-0 z-10"
                                aria-hidden="true"
                              />
                              {item.name}
                            </a>
                            <p aria-hidden="true" className="mt-1">
                              Shop now
                            </p>
                          </div>
                        ))}
                      </div> */}
                      {category.sections.map((section) => (
                        <div key={section.name}>
                          <a
                            href={"/dresses"}
                            id={`${category.id}-${section.id}-heading-mobile`}
                            className="font-medium text-gray-900"
                          >
                            {section.name}
                          </a>
                          <ul
                            role="list"
                            aria-labelledby={`${category.id}-${section.id}-heading-mobile`}
                            className="mt-6 flex flex-col space-y-6"
                          >
                            {section.items.map((item) => (
                              <li key={item.name} className="flow-root">
                                <a
                                  href={item.href}
                                  className="-m-2 block p-2 text-gray-500"
                                >
                                  {item.name}
                                </a>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </Tab.Panel>
                  ))}
                </Tab.Panels>
              </Tab.Group>

              <div className="space-y-6 border-t border-gray-200 px-4 py-6">
                {navigation.pages.map((page) => (
                  <div key={page.name} className="flow-root">
                    <a
                      href={page.href}
                      className="-m-2 block p-2 font-medium text-gray-900"
                    >
                      {page.name}
                    </a>
                  </div>
                ))}
              </div>

              <div className="space-y-6 border-t border-gray-200 px-4 py-6">
                <div className="flow-root">
                  <a
                    href={"/login"}
                    className="-m-2 block p-2 font-medium text-gray-900"
                  >
                    Sign in
                  </a>
                </div>
              </div>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition.Root>
  );
};

export default MobileNav;
