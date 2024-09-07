import React from "react";

import {
  AcademicCapIcon,
  UsersIcon,
  TruckIcon,
} from "@heroicons/react/20/solid";

const initialTabList = [
  { name: "Bookings", href: "#", icon: TruckIcon, current: true },
  { name: "Users", href: "#", icon: UsersIcon, current: false },
  { name: "Dresses", href: "#", icon: AcademicCapIcon, current: false },
];

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

interface ITabs {
  selected: String;
  setSelectedTab: React.Dispatch<React.SetStateAction<String>>;
}

const Tabs = ({ selected, setSelectedTab }: ITabs) => {
  const [tabList, setTabList] = React.useState(initialTabList);
  return (
    <div>
      <div className="sm:hidden">
        <label htmlFor="tabs" className="sr-only">
          Select a tab
        </label>
        {/* Use an "onChange" listener to redirect the user to the selected tab URL. */}
        <select
          id="tabs"
          name="tabs"
          // defaultValue={tabList.find((tab) => tab.current).name}
          className="block w-full rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
        >
          {tabList.map((tab) => (
            <option key={tab.name}>{tab.name}</option>
          ))}
        </select>
      </div>
      <div className="hidden sm:block">
        <div className="border-b border-gray-200">
          <nav
            aria-label="Tabs"
            className="-mb-px flex space-x-8 cursor-pointer"
          >
            {tabList.map((tab) => (
              <div
                key={tab.name}
                aria-current={tab.name == selected ? "page" : undefined}
                onClick={() => setSelectedTab(tab.name)}
                className={classNames(
                  tab.name == selected
                    ? "border-secondary-pink text-secondary-pink"
                    : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700",
                  "group inline-flex items-center border-b-2 px-1 py-4 text-sm font-medium"
                )}
              >
                <tab.icon
                  aria-hidden="true"
                  className={classNames(
                    tab.name == selected
                      ? "text-secondary-pink"
                      : "text-gray-400 group-hover:text-gray-500",
                    "-ml-0.5 mr-2 h-5 w-5"
                  )}
                />
                <span>{tab.name}</span>
              </div>
            ))}
          </nav>
        </div>
      </div>
    </div>
  );
};

export default Tabs;
