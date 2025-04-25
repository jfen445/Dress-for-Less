"use client";

import * as React from "react";
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
  Menu,
  MenuButton,
  MenuItem,
  MenuItems,
  Popover,
  PopoverButton,
  PopoverGroup,
  PopoverPanel,
} from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { ChevronDownIcon } from "@heroicons/react/20/solid";
import { useDressContext } from "@/context/DressContext";
import { useGlobalContext } from "@/context/GlobalContext";
import { DressType } from "../../../../common/types";
import dayjs from "dayjs";
import { useRouter, useSearchParams } from "next/navigation";

type Sort = {
  name: string;
  current: Boolean;
};

const defaultSortOptions = [
  { name: "Most Popular", current: true },
  { name: "Newest", current: false },
  { name: "Price: Low to High", current: false },
  { name: "Price: High to Low", current: false },
];

const defaultFilters = [
  {
    id: "category",
    name: "Category",
    options: [
      { value: "birthday", label: "Birthday", checked: false },
      { value: "wedding_guest", label: "Wedding Guest", checked: false },
      { value: "cocktail", label: "Cocktail", checked: false },
      { value: "day_events", label: "Day Events", checked: false },
      { value: "ball", label: "Ball", checked: false },
      { value: "graduation", label: "Graduation", checked: false },
      { value: "black_tie", label: "Black Tie", checked: false },
      { value: "festival", label: "Festival", checked: false },
      { value: "mini", label: "Mini", checked: false },
      { value: "midi", label: "Midi", checked: false },
      { value: "maxi", label: "Maxi", checked: false },
      { value: "sets", label: "Sets", checked: false },
      { value: "off_the_shoulder", label: "Off-the-Shoulder", checked: false },
      { value: "sleeveless", label: "Sleeveless", checked: false },
      { value: "short_sleeve", label: "Short Sleeve", checked: false },
      { value: "long_sleeve", label: "Long Sleeve", checked: false },
      { value: "trending_now", label: "Trending Now", checked: false },
      { value: "new_arrivals", label: "New Arrivals", checked: false },
      { value: "customer_faves", label: "Customer Faves", checked: false },
      { value: "holiday", label: "Holiday", checked: false },
      { value: "race_day", label: "Race Day", checked: false },
      { value: "strapless", label: "Strapless", checked: false },
    ],
  },
  {
    id: "color",
    name: "Color",
    options: [
      { value: "black", label: "Black", checked: false },
      { value: "white", label: "White", checked: false },
      { value: "red", label: "Red", checked: false },
      { value: "orange", label: "Orange", checked: false },
      { value: "yellow", label: "Yellow", checked: false },
      { value: "green", label: "Green", checked: false },
      { value: "blue", label: "Blue", checked: false },
      { value: "purple", label: "Purple", checked: false },
      { value: "pink", label: "Pink", checked: false },
      { value: "grey", label: "Grey", checked: false },
      { value: "brown", label: "Brown", checked: false },
      { value: "multicolour", label: "Multicolour", checked: false },
    ],
  },
  {
    id: "sizes",
    name: "Sizes",
    options: [
      { value: "XL", label: "XL", checked: false },
      { value: "L", label: "L", checked: false },
      { value: "M", label: "M", checked: false },
      { value: "S", label: "S", checked: false },
      { value: "XS", label: "XS", checked: false },
    ],
  },
];

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

const Filters = () => {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const { allDresses } = useGlobalContext();
  const { filteredDressList, setFilteredDressList, setIsLoading } =
    useDressContext();
  const [filters, setFilters] = React.useState(defaultFilters);
  const [filtersLoaded, setFiltersLoaded] = React.useState(false); //use to check if filters are loaded from URL and prevent re-rendering
  const [sortOptions, setSortOptions] =
    React.useState<Sort[]>(defaultSortOptions);

  const searchParams = useSearchParams();
  const filterQuery = searchParams.getAll("filter");

  // update the filters that are shown
  const activeFilters = React.useCallback(() => {
    const areAnyFiltersActive = (
      currentFilters: typeof defaultFilters
    ): boolean => {
      // Loop through each filter category
      for (const filter of currentFilters) {
        // Check if any option in the filter category is checked
        if (filter.options.some((option: { checked: any }) => option.checked)) {
          return true;
        }
      }
      return false; // Return false if no checked options are found
    };

    return areAnyFiltersActive(filters);
  }, [filters]);

  const onFilterClicked = (
    e: React.MouseEvent<HTMLInputElement, MouseEvent>
  ) => {
    const event = e.target as HTMLInputElement;
    updateFilters([event.value], event.checked);

    // if the filter is checked, add it to the query params
    if (event.checked) {
      addFilterToQueryParams(event.value);
    } else {
      removeFilterFromQueryParams(event.value);
    }
  };

  const updateFilters = React.useCallback(
    (values: string[], checked: boolean) => {
      setIsLoading(true);
      const newFilterObject = filters.map((filter) => ({
        ...filter,
        options: filter.options.map((option) =>
          values.includes(option.value) ? { ...option, checked } : option
        ),
      }));
      setFilters(newFilterObject);
      setIsLoading(false);
    },
    [filters, setIsLoading]
  );

  const addFilterToQueryParams = (newFilter: string) => {
    const currentFilters = searchParams.getAll("filter");
    const updatedFilters = [...new Set([...currentFilters, newFilter])];

    const params = new URLSearchParams();
    updatedFilters.forEach((f) => params.append("filter", f));

    router.push(`/dresses?${params.toString()}`);
  };

  const removeFilterFromQueryParams = (filterToRemove: string) => {
    const currentFilters = searchParams.getAll("filter");
    const updatedFilters = currentFilters.filter((f) => f !== filterToRemove);
    const params = new URLSearchParams();
    updatedFilters.forEach((f) => params.append("filter", f));

    router.push(`/dresses?${params.toString()}`);
  };

  const updateSortOption = (name: string, isCurrent: boolean): void => {
    // Iterate through the defaultSortOptions array
    const updatedSortObject = defaultSortOptions.map((option) => {
      if (option.name === name) {
        return { ...option, current: isCurrent }; // Update current for the matching option
      }
      return { ...option, current: false }; // Set current to false for all others
    });

    setSortOptions(updatedSortObject);

    setSort(name);
  };

  console.log("filteredDressList", filteredDressList);

  const setSort = React.useCallback(
    (name: string) => {
      switch (name) {
        case "Most Popular":
          break;
        case "Newest":
          const sortedDressesTime = [...filteredDressList].sort(
            (a: DressType, b: DressType) => {
              return dayjs(a._updatedAt).isAfter(dayjs(b._updatedAt)) ? -1 : 1;
            }
          );
          setFilteredDressList(sortedDressesTime);
          break;
        case "Price: Low to High":
          const sortedDressesLH = [...filteredDressList].sort(
            (a: DressType, b: DressType) => {
              const priceA = a.price ?? 0; // Default to 0 if a.price is null or undefined
              const priceB = b.price ?? 0;
              const diff =
                parseFloat(priceA.toString()) - parseFloat(priceB.toString());
              return diff > 0 ? 1 : -1;
            }
          );
          setFilteredDressList(sortedDressesLH);
          break;
        case "Price: High to Low":
          const sortedDressesHL = [...filteredDressList].sort(
            (a: DressType, b: DressType) => {
              const priceA = a.price ?? 0; // Default to 0 if a.price is null or undefined
              const priceB = b.price ?? 0;
              const diff =
                parseFloat(priceA.toString()) - parseFloat(priceB.toString());
              return diff > 0 ? -1 : 1;
            }
          );
          setFilteredDressList(sortedDressesHL);
          break;
        default:
      }
    },
    [filteredDressList, setFilteredDressList]
  );

  React.useEffect(() => {
    const currentSortOption = defaultSortOptions.find(
      (option) => option.current === true
    );

    if (currentSortOption) {
      setSort(currentSortOption?.name);
    }

    // Check if there are any filters in the URL
    if (!filtersLoaded && filterQuery.length > 0) {
      updateFilters(filterQuery, true); // your function to set filters
      setFiltersLoaded(true); // prevents duplicate applying on re-renders
    }
  }, [searchParams, filtersLoaded, filterQuery, setSort, updateFilters]);

  React.useEffect(() => {
    const filterDresses = () => {
      setIsLoading(true);

      // Get the selected filter values
      const selectedFilters = filters.reduce(
        (
          acc: {
            [key: string]: string[];
          },
          filter
        ) => {
          const selected = filter.options
            .filter((option) => option.checked)
            .map((option) => option.value);
          if (selected.length > 0) {
            acc[filter.id] = selected;
          }

          return acc;
        },
        {}
      );

      return allDresses.filter((dress) => {
        var filteredTags = dress.tags.map(function (item) {
          return item as unknown as string;
        });

        // Check categories and colors (tags array in the dress object)
        if (selectedFilters.category) {
          if (
            !selectedFilters.category.some((tag) => filteredTags.includes(tag))
          ) {
            return false;
          }
        }

        if (selectedFilters.color) {
          if (
            !selectedFilters.color.some((tag) => filteredTags.includes(tag))
          ) {
            return false;
          }
        }

        // Check size
        if (selectedFilters.sizes) {
          if (!hasAvailableSize(dress, selectedFilters.sizes)) {
            return false;
          }
        }

        return true;
      });
    };

    setFilteredDressList(filterDresses());
    setIsLoading(false);
  }, [allDresses, filters, setFilteredDressList, setIsLoading]);

  const hasAvailableSize = (item: any, sizes: string[]): boolean => {
    return sizes.some((size) => {
      const key = size.toLowerCase(); // convert to lowercase to match the object's keys
      return item[key] && item[key] >= 1;
    });
  };

  return (
    <div className="bg-white">
      {/* Mobile filter dialog */}
      <Dialog open={open} onClose={setOpen} className="relative z-40 sm:hidden">
        <DialogBackdrop
          transition
          className="fixed inset-0 bg-black/25 transition-opacity duration-300 ease-linear data-[closed]:opacity-0"
        />

        <div className="fixed inset-0 z-40 flex">
          <DialogPanel
            transition
            className="relative ml-auto flex size-full max-w-xs transform flex-col overflow-y-auto bg-white py-4 pb-12 shadow-xl transition duration-300 ease-in-out data-[closed]:translate-x-full"
          >
            <div className="flex items-center justify-between px-4">
              <h2 className="text-lg font-medium text-gray-900">Filters</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="-mr-2 flex size-10 items-center justify-center rounded-md bg-white p-2 text-gray-400"
              >
                <span className="sr-only">Close menu</span>
                <XMarkIcon aria-hidden="true" className="size-6" />
              </button>
            </div>

            {/* Filters */}
            <form className="mt-4">
              {filters.map((section) => (
                <Disclosure
                  key={section.name}
                  as="div"
                  className="border-t border-gray-200 px-4 py-6"
                >
                  <h3 className="-mx-2 -my-3 flow-root">
                    <DisclosureButton className="group flex w-full items-center justify-between bg-white px-2 py-3 text-sm text-gray-400">
                      <span className="font-medium text-gray-900">
                        {section.name}
                      </span>
                      <span className="ml-6 flex items-center">
                        <ChevronDownIcon
                          aria-hidden="true"
                          className="size-5 rotate-0 transform group-data-[open]:-rotate-180"
                        />
                      </span>
                    </DisclosureButton>
                  </h3>

                  <DisclosurePanel className="pt-6">
                    <div className="space-y-6">
                      {section.options.map((option, optionIdx) => (
                        <div key={option.value} className="flex gap-3">
                          <div className="flex h-5 shrink-0 items-center">
                            <div className="group grid size-4 grid-cols-1">
                              <input
                                defaultValue={option.value}
                                defaultChecked={false}
                                checked={option.checked}
                                id={`filter-mobile-${section.id}-${optionIdx}`}
                                name={`${section.id}[]`}
                                type="checkbox"
                                onClick={(e) => onFilterClicked(e)}
                                className="col-start-1 row-start-1 appearance-none rounded border border-gray-300 bg-white checked:border-indigo-600 checked:bg-indigo-600 indeterminate:border-indigo-600 indeterminate:bg-indigo-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:border-gray-300 disabled:bg-gray-100 disabled:checked:bg-gray-100 forced-colors:appearance-auto"
                              />
                              <svg
                                fill="none"
                                viewBox="0 0 14 14"
                                className="pointer-events-none col-start-1 row-start-1 size-3.5 self-center justify-self-center stroke-white group-has-[:disabled]:stroke-gray-950/25"
                              >
                                <path
                                  d="M3 8L6 11L11 3.5"
                                  strokeWidth={2}
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  className="opacity-0 group-has-[:checked]:opacity-100"
                                />
                                <path
                                  d="M3 7H11"
                                  strokeWidth={2}
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  className="opacity-0 group-has-[:indeterminate]:opacity-100"
                                />
                              </svg>
                            </div>
                          </div>
                          <label
                            htmlFor={`filter-mobile-${section.id}-${optionIdx}`}
                            className="text-sm text-gray-500"
                          >
                            {option.label}
                          </label>
                        </div>
                      ))}
                    </div>
                  </DisclosurePanel>
                </Disclosure>
              ))}
            </form>
          </DialogPanel>
        </div>
      </Dialog>

      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
          A dress for any ocassion
        </h1>
        <p className="mt-4 max-w-xl text-sm text-gray-700">
          Find the perfect dress for any occasion! Whether you are attending a
          wedding, celebrating a special event, or simply looking to elevate
          your everyday look, our collection offers a range of stylish dresses
          designed to fit every moment. From elegant evening gowns to casual
          chic options, we have something for every occasion and every style.
        </p>
      </div>

      {/* Filters */}
      <section aria-labelledby="filter-heading">
        <h2 id="filter-heading" className="sr-only">
          Filters
        </h2>

        <div className="border-b border-gray-200 bg-white pb-4">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
            <Menu as="div" className="relative inline-block text-left">
              <div>
                <MenuButton className="group inline-flex justify-center text-sm font-medium text-gray-700 hover:text-gray-900">
                  Sort
                  <ChevronDownIcon
                    aria-hidden="true"
                    className="-mr-1 ml-1 size-5 shrink-0 text-gray-400 group-hover:text-gray-500"
                  />
                </MenuButton>
              </div>

              <MenuItems
                transition
                className="absolute left-0 z-10 mt-2 w-40 origin-top-left rounded-md bg-white shadow-2xl ring-1 ring-black/5 transition focus:outline-none data-[closed]:scale-95 data-[closed]:transform data-[closed]:opacity-0 data-[enter]:duration-100 data-[leave]:duration-75 data-[enter]:ease-out data-[leave]:ease-in"
              >
                <div className="py-1">
                  {sortOptions.map((option) => (
                    <MenuItem key={option.name}>
                      <div
                        onClick={() => updateSortOption(option.name, true)}
                        className={classNames(
                          option.current
                            ? "font-medium text-gray-900"
                            : "text-gray-500",
                          "cursor-pointer block px-4 py-2 text-sm data-[focus]:bg-gray-100 data-[focus]:outline-none"
                        )}
                      >
                        {option.name}
                      </div>
                    </MenuItem>
                  ))}
                </div>
              </MenuItems>
            </Menu>

            <button
              type="button"
              onClick={() => setOpen(true)}
              className="inline-block text-sm font-medium text-gray-700 hover:text-gray-900 sm:hidden"
            >
              Filters
            </button>

            <div className="hidden sm:block">
              <div className="flow-root">
                <PopoverGroup className="-mx-4 flex items-center divide-x divide-gray-200">
                  {filters.map((section) => (
                    <Popover
                      key={section.name}
                      className="relative inline-block px-4 text-left"
                    >
                      <PopoverButton className="group inline-flex justify-center text-sm font-medium text-gray-700 hover:text-gray-900">
                        <span>{section.name}</span>
                        {/* number of categories filtered */}
                        {/* {sectionIdx === 0 ? (
                          <span className="ml-1.5 rounded bg-gray-200 px-1.5 py-0.5 text-xs font-semibold tabular-nums text-gray-700">
                            1
                          </span>
                        ) : null} */}
                        <ChevronDownIcon
                          aria-hidden="true"
                          className="-mr-1 ml-1 size-5 shrink-0 text-gray-400 group-hover:text-gray-500"
                        />
                      </PopoverButton>

                      <PopoverPanel
                        transition
                        className="absolute right-0 z-10 mt-2 origin-top-right rounded-md bg-white p-4 shadow-2xl ring-1 ring-black/5 transition focus:outline-none data-[closed]:scale-95 data-[closed]:transform data-[closed]:opacity-0 data-[enter]:duration-100 data-[leave]:duration-75 data-[enter]:ease-out data-[leave]:ease-in"
                      >
                        <form className="space-y-4">
                          {section.options.map((option, optionIdx) => (
                            <div key={option.value} className="flex gap-3">
                              <div className="flex h-5 shrink-0 items-center">
                                <div className="group grid size-4 grid-cols-1">
                                  <input
                                    defaultValue={option.value}
                                    checked={option.checked}
                                    id={`filter-${section.id}-${optionIdx}`}
                                    name={`${section.id}[]`}
                                    type="checkbox"
                                    onClick={(e) => onFilterClicked(e)}
                                    className="col-start-1 row-start-1 appearance-none rounded border border-gray-300 bg-white checked:border-indigo-600 checked:bg-indigo-600 indeterminate:border-indigo-600 indeterminate:bg-indigo-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:border-gray-300 disabled:bg-gray-100 disabled:checked:bg-gray-100 forced-colors:appearance-auto"
                                  />
                                  <svg
                                    fill="none"
                                    viewBox="0 0 14 14"
                                    className="pointer-events-none col-start-1 row-start-1 size-3.5 self-center justify-self-center stroke-white group-has-[:disabled]:stroke-gray-950/25"
                                  >
                                    <path
                                      d="M3 8L6 11L11 3.5"
                                      strokeWidth={2}
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      className="opacity-0 group-has-[:checked]:opacity-100"
                                    />
                                    <path
                                      d="M3 7H11"
                                      strokeWidth={2}
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      className="opacity-0 group-has-[:indeterminate]:opacity-100"
                                    />
                                  </svg>
                                </div>
                              </div>
                              <label
                                htmlFor={`filter-${section.id}-${optionIdx}`}
                                className="whitespace-nowrap pr-6 text-sm font-medium text-gray-900"
                              >
                                {option.label}
                              </label>
                            </div>
                          ))}
                        </form>
                      </PopoverPanel>
                    </Popover>
                  ))}
                </PopoverGroup>
              </div>
            </div>
          </div>
        </div>

        {/* Active filters */}
        {activeFilters() && (
          <div className="bg-gray-100">
            <div className="mx-auto max-w-7xl px-4 py-3 sm:flex sm:items-center sm:px-6 lg:px-8">
              <h3 className="text-sm font-medium text-gray-500">
                Filters
                <span className="sr-only">, active</span>
              </h3>

              <div
                aria-hidden="true"
                className="hidden h-5 w-px bg-gray-300 sm:ml-4 sm:block"
              />

              <div className="mt-2 sm:ml-4 sm:mt-0">
                <div className="-m-1 flex flex-wrap items-center">
                  {filters.map((filter) =>
                    filter.options
                      .filter((option) => option.checked) // Filter out only checked options
                      .map((activeFilter) => (
                        <span
                          key={activeFilter.value}
                          className="m-1 inline-flex items-center rounded-full border border-gray-200 bg-white py-1.5 pl-3 pr-2 text-sm font-medium text-gray-900"
                        >
                          <span>{activeFilter.label}</span>
                          <button
                            type="button"
                            onClick={() => {
                              updateFilters([activeFilter.value], false);
                              removeFilterFromQueryParams(activeFilter.value);
                            }}
                            className="ml-1 inline-flex size-4 shrink-0 rounded-full p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-500"
                          >
                            <span className="sr-only">
                              Remove filter for {activeFilter.label}
                            </span>
                            <svg
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 8 8"
                              className="size-2"
                            >
                              <path
                                d="M1 1l6 6m0-6L1 7"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                              />
                            </svg>
                          </button>
                        </span>
                      ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default Filters;
