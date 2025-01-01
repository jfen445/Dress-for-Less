"use client";

import { Popover } from "@headlessui/react";
import {
  Bars3Icon,
  MagnifyingGlassIcon,
  ShoppingBagIcon,
  UserIcon,
} from "@heroicons/react/16/solid";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import DFLLogo from "../../../public/dfl-logo-transparent.jpeg";
import { useUserContext } from "@/context/UserContext";
import { useNavigationContext } from "@/context/NavigationContext";

const navItems = [
  {
    id: "dresses",
    name: "Dresses",
    href: "/dresses",
  },
  {
    id: "about",
    name: "About",
    href: "/about",
  },
  {
    id: "tc",
    name: "T&C",
    href: "/tc",
    sub: [
      {
        id: "faq",
        name: "FAQ",
        href: "/faq",
      },
      {
        id: "policies",
        name: "Policies",
        href: "/policies",
      },
    ],
  },
];

const Navigation = () => {
  const { userInfo } = useUserContext();
  const { data: session } = useSession();
  const { setMobileNavOpen } = useNavigationContext();

  const isCurrentPage = (href: string): Boolean => {
    if (typeof window !== "undefined") {
      const url = window.location.href;
      return url.includes(href);
    }

    return false;
  };

  return (
    <header className="bg-white z-10 w-full">
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
                <div className="hidden sm:ml-6 sm:flex sm:space-x-8 flex">
                  {/* Current: "border-indigo-500 text-gray-900", Default: "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700" */}
                  {/* {navItems.map((item) => (
                    <>
                      <a
                        id={item.id}
                        key={item.id}
                        href={item.href}
                        className={`inline-flex items-center border-b-2 px-1 pt-1 text-sm font-medium ${
                          isCurrentPage(item.href)
                            ? "border-secondary-pink text-gray-900"
                            : "text-gray-500 hover:border-gray-300 hover:text-gray-700"
                        }`}
                      >
                        {item.name}
                      </a>
                    </>
                  ))} */}

                  {navItems.map((item) => (
                    <>
                      <Menu
                        as="div"
                        className="relative ml-3 inline-flex items-center"
                      >
                        <div className="flex min-h-full">
                          <MenuButton className="relative">
                            {item?.sub ? (
                              <div
                                className={`inline-flex items-center border-b-2 px-1 pt-1 text-sm font-medium min-h-full ${
                                  isCurrentPage(
                                    item.sub
                                      .map(function (x) {
                                        return x.href;
                                      })
                                      .join(", ")
                                  )
                                    ? "border-secondary-pink text-gray-900"
                                    : "text-gray-500 hover:border-gray-300 hover:text-gray-700"
                                }`}
                              >
                                {item.name}
                              </div>
                            ) : (
                              <a
                                href={item.href}
                                className={`inline-flex items-center border-b-2 px-1 pt-1 text-sm font-medium min-h-full ${
                                  isCurrentPage(item.href)
                                    ? "border-secondary-pink text-gray-900"
                                    : "text-gray-500 hover:border-gray-300 hover:text-gray-700"
                                }`}
                              >
                                {item.name}
                              </a>
                            )}
                          </MenuButton>
                        </div>
                        {item?.sub && (
                          <MenuItems
                            transition
                            className="absolute left-0 top-14 z-10 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 transition focus:outline-none data-[closed]:scale-95 data-[closed]:transform data-[closed]:opacity-0 data-[enter]:duration-200 data-[leave]:duration-75 data-[enter]:ease-out data-[leave]:ease-in"
                          >
                            {item.sub.map((subItem) => (
                              <>
                                <MenuItem>
                                  <a
                                    href={subItem.href}
                                    className="block px-4 py-2 text-sm text-gray-700"
                                  >
                                    {subItem.name}
                                  </a>
                                </MenuItem>
                              </>
                            ))}
                          </MenuItems>
                        )}
                      </Menu>
                    </>
                  ))}
                </div>
              </div>
            </Popover.Group>

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
              {session && (
                <div className="ml-4 flow-root lg:ml-6">
                  <Link
                    href="/cart"
                    className="group -m-2 flex items-center p-2"
                  >
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
              )}

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
                        src={
                          session && session.user && session.user.image
                            ? session.user.image
                            : ""
                        }
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

export default Navigation;
