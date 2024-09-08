import Modal from "@/components/Modal";
import React from "react";
import { UserType } from "../../../../common/types";
import Button from "@/components/Button";
import Input from "@/components/Input";

interface IUserModal {
  isOpen: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  user: UserType | null;
  children?: React.ReactNode;
}

const UserModal = ({ isOpen, setOpen, user, children }: IUserModal) => {
  return (
    <>
      <Modal isOpen={isOpen} setOpen={setOpen}>
        <div className="bg-white mx-auto grid max-w-7xl grid-cols-1 gap-x-8 gap-y-10 px-4 py-16 sm:px-6 md:grid-cols-3 lg:px-8">
          <form className="md:col-span-2">
            <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:max-w-xl sm:grid-cols-6">
              <div className="col-span-full flex items-center gap-x-8">
                <img
                  alt=""
                  src={user?.photo}
                  className="h-24 w-24 flex-none rounded-lg bg-gray-800 object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>

              <div className="sm:col-span-3">
                <label
                  htmlFor="first-name"
                  className="block text-sm font-medium leading-6  "
                >
                  Name
                </label>
                <div className="mt-2">
                  <Input
                    value={user?.name}
                    id="firstname"
                    name="firstname"
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
                    value={user?.email}
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
                  className="block text-sm font-medium leading-6"
                >
                  Mobile
                </label>
                <div className="mt-2">
                  <div className="flex rounded-md bg-white/5 ring-1 ring-inset ring-white/10 focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-500">
                    <Input
                      value={user?.mobileNumber}
                      id="mobile"
                      name="mobile"
                      type="number"
                      className=""
                    />
                  </div>
                </div>
              </div>

              <div className="col-span-full">
                <label
                  htmlFor="username"
                  className="block text-sm font-medium leading-6  "
                >
                  Instagram Handle
                </label>
                <div className="mt-2">
                  <div className="flex rounded-md bg-white/5 ring-1 ring-inset ring-white/10 focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-500">
                    <Input
                      value={user?.instagramHandle}
                      id="instagramHandle"
                      name="instagramHandle"
                      type="text"
                      className=""
                    />
                  </div>
                </div>
              </div>

              <div className="col-span-full">
                <label
                  htmlFor="username"
                  className="block text-sm font-medium leading-6  "
                >
                  Photo Identification
                </label>
                <div className="mt-2">
                  {user?.photo ? (
                    <img
                      src={user?.photo}
                      alt="photo identification"
                      className="my-2 h-64 w-full object-cover border-4 border-primary-pink rounded-lg"
                    />
                  ) : null}
                  <div className="flex rounded-md bg-white/5 ring-1 ring-inset ring-white/10 focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-500">
                    <Input
                      id="instagramHandle"
                      name="instagramHandle"
                      type="file"
                      required={true}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 flex">
              <Button
                type="submit"
                className="rounded-md bg-indigo-500 px-3 py-2 text-sm font-semibold shadow-sm enable:hover:bg-indigo-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
              >
                Save
              </Button>
            </div>
          </form>
        </div>
      </Modal>
    </>
  );
};

export default UserModal;
