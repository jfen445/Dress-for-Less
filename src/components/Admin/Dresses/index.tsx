import React from "react";
import Spinner from "@/components/Spinner";
import { useGlobalContext } from "@/context/GlobalContext";

const AdminDresses = () => {
  const { allDresses } = useGlobalContext();

  return (
    <>
      <div className="p-4 sm:px-6 lg:px-8">
        <div className="sm:flex sm:items-center pb-4">
          <div className="sm:flex-auto">
            <h1 className="text-base font-semibold leading-6 text-gray-900">
              Dresses
            </h1>
            <p className="mt-2 text-sm text-gray-700">
              A list of all the dresses
            </p>
          </div>
        </div>
        {allDresses && allDresses.length > 0 ? (
          <ul
            role="list"
            className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
          >
            {allDresses.map((dress) => (
              <li
                key={dress._id}
                className="col-span-1 flex flex-col divide-y divide-gray-200 rounded-lg bg-white text-center shadow"
              >
                <div className="flex flex-1 flex-col p-8">
                  <img
                    alt=""
                    src={dress.images[0]}
                    className="mx-auto h-32 w-32 flex-shrink-0 rounded-full"
                  />
                  <h3 className="mt-6 text-sm font-medium text-gray-900">
                    {dress.name}
                  </h3>
                  <dl className="mt-1 flex flex-grow flex-col justify-between">
                    <dd className="mt-3">
                      <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                        Active
                      </span>
                    </dd>
                  </dl>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex justify-center">
            <Spinner />
          </div>
        )}
      </div>
    </>
  );
};

export default AdminDresses;
