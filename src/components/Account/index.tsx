import React from "react";
import Input from "../Input";
import { useSession } from "next-auth/react";

const Account = () => {
  const { data: session } = useSession();

  const firstName =
    session && session.user && session.user.name
      ? session.user.name.split(" ")[0]
      : "";

  const lastName =
    session && session.user && session.user.name
      ? session.user.name.split(" ")[1]
      : "";

  const email =
    session && session.user && session.user.email ? session.user.email : "";

  return (
    <main>
      <div className="bg-white mx-auto grid max-w-7xl grid-cols-1 gap-x-8 gap-y-10 px-4 py-16 sm:px-6 md:grid-cols-3 lg:px-8">
        <div>
          <h2 className="text-base font-semibold leading-7">
            Account Information
          </h2>
          <p className="mt-1 text-sm leading-6 text-gray-400">
            Account information is important to verify who you are
          </p>
        </div>

        <form className="md:col-span-2">
          <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:max-w-xl sm:grid-cols-6">
            <div className="col-span-full flex items-center gap-x-8">
              <img
                alt=""
                src="https://lh3.googleusercontent.com/a/ACg8ocKvwSGZnZaYCt8LyWKBgeTU_bkz1MpZtimBX3SIey-DQBNukBu0=s96-c"
                className="h-24 w-24 flex-none rounded-lg bg-gray-800 object-cover"
              />
              <div>
                <button
                  type="button"
                  className="rounded-md bg-white/10 px-3 py-2 text-sm font-semibold shadow-sm hover:bg-white/20"
                >
                  Change avatar
                </button>
                <p className="mt-2 text-xs leading-5 text-gray-400">
                  JPG, GIF or PNG. 1MB max.
                </p>
              </div>
            </div>

            <div className="sm:col-span-3">
              <label
                htmlFor="first-name"
                className="block text-sm font-medium leading-6  "
              >
                First name
              </label>
              <div className="mt-2">
                <Input
                  value={firstName}
                  id="first-name"
                  name="first-name"
                  type="text"
                  className="bg-gray-200"
                  readonly
                  disabled
                />
              </div>
            </div>

            <div className="sm:col-span-3">
              <label
                htmlFor="last-name"
                className="block text-sm font-medium leading-6  "
              >
                Last name
              </label>
              <div className="mt-2">
                <Input
                  value={lastName}
                  id="last-name"
                  name="last-name"
                  type="text"
                  className="bg-gray-200"
                  readonly
                  disabled
                />
              </div>
            </div>

            <div className="col-span-full">
              <label
                htmlFor="email"
                className="block text-sm font-medium leading-6  "
              >
                Email address
              </label>
              <div className="mt-2">
                <Input
                  value={email}
                  id="email"
                  name="email"
                  type="email"
                  className="bg-gray-200"
                  readonly
                  disabled
                />
              </div>
            </div>

            <div className="col-span-full">
              <label
                htmlFor="username"
                className="block text-sm font-medium leading-6  "
              >
                Username
              </label>
              <div className="mt-2">
                <div className="flex rounded-md bg-white/5 ring-1 ring-inset ring-white/10 focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-500">
                  <Input
                    id="username"
                    name="username"
                    type="text"
                    className="flex-1 border-0 bg-transparent py-1.5 pl-1   focus:ring-0 sm:text-sm sm:leading-6"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 flex">
            <button
              type="submit"
              className="rounded-md bg-indigo-500 px-3 py-2 text-sm font-semibold   shadow-sm hover:bg-indigo-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </main>
  );
};

export default Account;
