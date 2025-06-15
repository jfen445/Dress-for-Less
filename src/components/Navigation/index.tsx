"use client";

import { useNavigationContext } from "@/context/NavigationContext";
import { useUserContext } from "@/context/UserContext";
import {
  Menu,
  MenuButton,
  MenuItem,
  MenuItems,
  Popover,
  Transition,
} from "@headlessui/react";
import {
  Bars3Icon,
  MagnifyingGlassIcon,
  ShoppingBagIcon,
  UserIcon,
} from "@heroicons/react/16/solid";
import AboutImage from "../../../public/aboutimg.jpg";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import DFLLogo from "../../../public/dfl-logo-transparent.jpeg";
import { Fragment } from "react";
import { navigationSections } from "@/model/navigation";
import { Navigation } from "../../../common/types/navigation";

const navigation: Navigation = {
  categories: [
    {
      id: "dresses",
      name: "Dresses",
      href: "/dresses",
      featured: [
        {
          name: "Shop the collection",
          href: "/dresses",
          imageSrc: AboutImage.src,
          imageAlt: "Dress for Less collection",
        },
        // {
        //   name: "Basic Tees",
        //   href: "#",
        //   imageSrc:
        //     "https://tailwindui.com/img/ecommerce-images/mega-menu-category-02.jpg",
        //   imageAlt:
        //     "Close up of Basic Tee fall bundle with off-white, ochre, olive, and black tees.",
        // },
        // {
        //   name: "Accessories",
        //   href: "#",
        //   imageSrc:
        //     "https://tailwindui.com/img/ecommerce-images/mega-menu-category-03.jpg",
        //   imageAlt:
        //     "Model wearing minimalist watch with black wristband and white watch face.",
        // },
      ],
      sections: navigationSections,
    },
    {
      id: "about",
      name: "About",
      href: "/about",
      featured: [],
      sections: [],
    },
    {
      id: "faq",
      name: "Faq",
      href: "/faq",
      featured: [],
      sections: [],
    },
    {
      id: "policies",
      name: "Policies",
      href: "/policies",
      featured: [],
      sections: [],
    },
  ],
  pages: [
    { name: "Company", href: "#" },
    { name: "Stores", href: "#" },
  ],
};

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

const NavigationBar = () => {
  const { userInfo, getUserProfleImage } = useUserContext();
  const { data: session } = useSession();
  const { setMobileNavOpen } = useNavigationContext();

  return (
    <header className="relative bg-white">
      <nav aria-label="Top" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="border-b border-gray-200">
          <div className="flex h-16 items-center justify-between">
            <div className="flex flex-1 items-center lg:hidden">
              <button
                type="button"
                className="-ml-2 rounded-md bg-white p-2 text-gray-400"
                onClick={() => setMobileNavOpen(true)}
              >
                <span className="sr-only">Open menu</span>
                <Bars3Icon className="h-6 w-6" aria-hidden="true" />
              </button>
              <a
                href="#"
                className="ml-2 p-2 text-gray-400 hover:text-gray-500"
              >
                <span className="sr-only">Search</span>
                <MagnifyingGlassIcon className="h-6 w-6" aria-hidden="true" />
              </a>
            </div>

            {/* Flyout menus */}
            <Popover.Group className="hidden lg:block lg:flex-1 lg:self-stretch">
              <div className="flex h-full space-x-8">
                <Link href="/" className="flex flex-shrink-0 items-center">
                  <img
                    className="h-4 w-auto"
                    src={DFLLogo.src}
                    alt="Your Company"
                  />
                </Link>
                {navigation.categories.map((category) => (
                  <Popover key={category.name} className="flex">
                    {({ open }) => (
                      <>
                        <div className="relative flex">
                          <Popover.Button
                            className={classNames(
                              open
                                ? "text-secondary-pink"
                                : "text-gray-700 hover:text-gray-800",
                              "relative z-10 flex items-center justify-center text-sm font-medium transition-colors duration-200 ease-out"
                            )}
                          >
                            {category.sections.length > 0 ? (
                              category.name
                            ) : (
                              <Link
                                href={category.href}
                                className="flex flex-shrink-0 items-center"
                              >
                                {category.name}
                              </Link>
                            )}
                            <span
                              className={classNames(
                                open ? "bg-secondary-pink" : "",
                                "absolute inset-x-0 bottom-0 h-0.5 transition-colors duration-200 ease-out sm:mt-5 sm:translate-y-px sm:transform"
                              )}
                              aria-hidden="true"
                            />
                          </Popover.Button>
                        </div>
                        {category.sections.length > 0 && (
                          <Transition
                            as={Fragment}
                            enter="transition ease-out duration-200"
                            enterFrom="opacity-0"
                            enterTo="opacity-100"
                            leave="transition ease-in duration-150"
                            leaveFrom="opacity-100"
                            leaveTo="opacity-0"
                          >
                            <Popover.Panel className="absolute inset-x-0 top-full z-20">
                              {/* Presentational element used to render the bottom shadow, if we put the shadow on the actual panel it pokes out the top, so we use this shorter element to hide the top of the shadow */}
                              <div
                                className="absolute inset-0 top-1/2 bg-white shadow"
                                aria-hidden="true"
                              />
                              <div className="relative bg-white">
                                <div className="mx-auto max-w-7xl px-8">
                                  <div className="grid grid-cols-2 gap-x-8 gap-y-10 py-16">
                                    {category.featured.length > 0 && (
                                      <>
                                        <div className="grid grid-cols-2 grid-rows-1 gap-8 text-sm">
                                          {category.featured.map(
                                            (item, itemIdx) => (
                                              <div
                                                key={item.name}
                                                className={classNames(
                                                  itemIdx === 0
                                                    ? "aspect-w-2 col-span-2"
                                                    : "",
                                                  "group aspect-w-1 aspect-h-1 relative overflow-hidden rounded-md bg-gray-100"
                                                )}
                                              >
                                                <img
                                                  src={item.imageSrc}
                                                  alt={item.imageAlt}
                                                  className="object-cover object-center group-hover:opacity-75"
                                                />
                                                <div className="flex flex-col justify-end">
                                                  <div className="bg-white bg-opacity-60 p-4 text-sm">
                                                    <a
                                                      href={item.href}
                                                      className="font-medium text-gray-900"
                                                    >
                                                      <span
                                                        className="absolute inset-0"
                                                        aria-hidden="true"
                                                      />
                                                      {item.name}
                                                    </a>
                                                    <p
                                                      aria-hidden="true"
                                                      className="mt-0.5 text-gray-700 sm:mt-1"
                                                    >
                                                      Shop now
                                                    </p>
                                                  </div>
                                                </div>
                                              </div>
                                            )
                                          )}
                                        </div>
                                      </>
                                    )}

                                    {category.sections.length > 0 && (
                                      <div className="grid grid-cols-3 gap-x-8 gap-y-10 text-sm text-gray-500">
                                        {category.sections.map(
                                          (column, columnIdx) => (
                                            <div
                                              key={columnIdx}
                                              className="space-y-10"
                                            >
                                              {column.map((section) => (
                                                <div key={section.name}>
                                                  <p
                                                    id={`${category.id}-${section.id}-heading`}
                                                    className="font-medium text-gray-900"
                                                  >
                                                    {section.name}
                                                  </p>
                                                  <ul
                                                    role="list"
                                                    aria-labelledby={`${category.id}-${section.id}-heading`}
                                                    className="mt-4 space-y-4"
                                                  >
                                                    {section.items.map(
                                                      (item) => (
                                                        <li
                                                          key={item.name}
                                                          className="flex"
                                                        >
                                                          <a
                                                            href={`${category.href}?filter=${item.href}`}
                                                            className="hover:text-gray-800"
                                                          >
                                                            {item.name}
                                                          </a>
                                                        </li>
                                                      )
                                                    )}
                                                  </ul>
                                                </div>
                                              ))}
                                            </div>
                                          )
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </Popover.Panel>
                          </Transition>
                        )}
                      </>
                    )}
                  </Popover>
                ))}
              </div>
            </Popover.Group>
            <Link
              href="/"
              className="flex flex-shrink-0 items-center lg:hidden"
            >
              <img
                className="h-4 w-auto"
                src={DFLLogo.src}
                alt="Your Company"
              />
            </Link>

            <div className="flex flex-1 items-center justify-end">
              {/* Search */}
              {/* <Link
                href="#"
                className="ml-6 hidden p-2 text-gray-400 hover:text-gray-500 lg:block"
              >
                <span className="sr-only">Search</span>
                <MagnifyingGlassIcon className="h-6 w-6" aria-hidden="true" />
              </Link> */}

              {/* Cart */}

              <div className="ml-4 flow-root lg:ml-6">
                <Link href="/cart" className="group -m-2 flex items-center p-2">
                  <ShoppingBagIcon
                    className="h-6 w-6 flex-shrink-0 text-gray-400 group-hover:text-gray-500"
                    aria-hidden="true"
                  />
                  {/* <span className="ml-2 text-sm font-medium text-gray-700 group-hover:text-gray-800">
                    0
                  </span> */}
                  <span className="sr-only">items in cart, view bag</span>
                </Link>
              </div>

              {!session ? (
                <Link
                  href={"/login"}
                  className="p-2 text-gray-400 hover:text-gray-500 lg:ml-4"
                >
                  <span className="sr-only">Account</span>
                  <UserIcon className="h-6 w-6" aria-hidden="true" />
                </Link>
              ) : (
                <Menu as="div" className="relative ml-3">
                  <div>
                    <MenuButton className="relative flex rounded-full bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-800">
                      <span className="absolute -inset-1.5" />
                      <span className="sr-only">Open user menu</span>
                      <img
                        alt=""
                        src={getUserProfleImage()}
                        className="h-8 w-8 rounded-full border-2 border-secondary-pink"
                        referrerPolicy="no-referrer"
                      />
                    </MenuButton>
                  </div>
                  <MenuItems
                    transition
                    className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 transition focus:outline-none data-[closed]:scale-95 data-[closed]:transform data-[closed]:opacity-0 data-[enter]:duration-200 data-[leave]:duration-75 data-[enter]:ease-out data-[leave]:ease-in"
                  >
                    {userInfo?.role == "admin" && (
                      <MenuItem>
                        <a
                          href={"/admin"}
                          className="block px-4 py-2 text-sm text-gray-700"
                        >
                          Admin
                        </a>
                      </MenuItem>
                    )}
                    <MenuItem>
                      <a
                        href={"/account"}
                        className="block px-4 py-2 text-sm text-gray-700"
                      >
                        Account
                      </a>
                    </MenuItem>
                    {userInfo && (
                      <MenuItem>
                        <a
                          href={"/order-history"}
                          className="block px-4 py-2 text-sm text-gray-700"
                        >
                          Order History
                        </a>
                      </MenuItem>
                    )}
                    <MenuItem>
                      <a
                        onClick={() => signOut()}
                        className="block px-4 py-2 text-sm text-gray-700 cursor-pointer"
                      >
                        Sign out
                      </a>
                    </MenuItem>
                  </MenuItems>
                </Menu>
              )}
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
};

export default NavigationBar;
