import Modal from "@/components/Modal";
import React from "react";
import { UserType } from "../../../../common/types";
import Button from "@/components/Button";
import Input from "@/components/Input";
import { updateUserAccount } from "@/api/user";

interface IUserModal {
  isOpen: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  user: UserType | null;
  children?: React.ReactNode;
  onSaved?: (user: UserType) => void;
}

const UserModal = ({ isOpen, setOpen, user, children, onSaved }: IUserModal) => {
  const [name, setName] = React.useState("");
  const [mobileNumber, setMobileNumber] = React.useState("");
  const [instagramHandle, setInstagramHandle] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    if (!isOpen) return;
    setName(user?.name ?? "");
    setMobileNumber(user?.mobileNumber ?? "");
    setInstagramHandle(user?.instagramHandle ?? "");
    setError("");
  }, [user, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSubmitting(true);
    setError("");
    try {
      const updatedUser: UserType = {
        ...user,
        name,
        mobileNumber,
        instagramHandle,
      };
      await updateUserAccount(updatedUser);
      onSaved?.(updatedUser);
      setOpen(false);
    } catch (err: any) {
      setError(err?.message ?? "Failed to save user");
    } finally {
      setIsSubmitting(false);
    }
  };

  const makeLetterAvatar = (
    letter: string,
    size = 100,
    bg = "#FFDCE6",
    fg = "#1F2937",
    font = "Arial, Helvetica, sans-serif",
  ) => {
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}' viewBox='0 0 ${size} ${size}'>
    <rect width='100%' height='100%' fill='${bg}' rx='8' ry='8'/>
    <text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-family='${font}' font-size='${Math.floor(
      size * 0.48,
    )}' fill='${fg}' font-weight='600'>${letter}</text>
  </svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  };
  return (
    <>
      <Modal isOpen={isOpen} setOpen={setOpen}>
        <div className="bg-white mx-auto grid max-w-7xl grid-cols-1 gap-x-8 gap-y-10 px-4 py-16 sm:px-6 md:grid-cols-3 lg:px-8">
          <form className="md:col-span-2" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:max-w-xl sm:grid-cols-6">
              <div className="col-span-full flex items-center gap-x-8">
                <img
                  alt=""
                  src={makeLetterAvatar(
                    user?.name?.charAt(0) || user?.email?.charAt(0) || "U",
                  )}
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
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    id="firstname"
                    name="firstname"
                    type="text"
                    className=""
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
                      value={mobileNumber}
                      onChange={(e) => setMobileNumber(e.target.value)}
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
                      value={instagramHandle}
                      onChange={(e) => setInstagramHandle(e.target.value)}
                      id="instagramHandle"
                      name="instagramHandle"
                      type="text"
                      className=""
                    />
                  </div>
                </div>
              </div>
            </div>

            {error && (
              <p className="mt-4 text-sm text-red-600">{error}</p>
            )}

            <div className="mt-8 flex">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="rounded-md bg-indigo-500 px-3 py-2 text-sm font-semibold shadow-sm enable:hover:bg-indigo-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
              >
                {isSubmitting ? "Saving…" : "Save"}
              </Button>
            </div>
          </form>
        </div>
      </Modal>
    </>
  );
};

export default UserModal;
