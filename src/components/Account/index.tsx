import React, { ChangeEvent } from "react";
import Input from "../Input";
import { useSession } from "next-auth/react";
import Button from "../Button";
import { UserType } from "../../../common/types";
import { getUser, updateUserAccount } from "@/api/user";
import Toast, { ToastType } from "../Toast";
import { useUserContext } from "@/context/UserContext";
import Spinner from "../Spinner";
import { useCartContext } from "@/context/CartContext";

const Account = () => {
  const { data: session } = useSession();
  const { fetchData, getUserProfileImage } = useUserContext();
  const { refreshCart } = useCartContext();
  const [firstName, setFirstName] = React.useState<string>(
    session && session.user && session.user.name
      ? session.user.name.split(" ")[0]
      : "",
  );
  const [lastName, setLastName] = React.useState<string>(
    session && session.user && session.user.name
      ? session.user.name.split(" ")[1]
      : "",
  );
  const [mobile, setMobile] = React.useState<string>("");
  const [instagramHandle, setInstagramHandle] = React.useState<string>("");
  const [toast, setToast] = React.useState<ToastType>({
    message: "Account saved",
    variant: "success",
    show: false,
  });
  const [isSaving, setIsSaving] = React.useState<boolean>(false);
  const [photoWarningText, setPhotoWarningText] =
    React.useState<boolean>(false);
  const [isEditMode, setIsEditMode] = React.useState<boolean>(false);

  const email =
    session && session.user && session.user.email ? session.user.email : "";

  const profileImage = getUserProfileImage();

  React.useEffect(() => {
    const getCurrentUser = async () => {
      getUser(email)
        .then((res) => {
          if (res === undefined) return;
          const user = res.data as unknown as UserType;
          setFirstName(user.name.split(" ")[0]);
          setLastName(user.name.split(" ")[1]);
          setMobile(user.mobileNumber);
          setInstagramHandle(user.instagramHandle ?? "");
        })
        .catch((err) => console.error(err));
    };

    getCurrentUser();
  }, [email]);

  React.useEffect(() => {
    refreshCart();
  }, []);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setIsSaving(true);

    const form = event.currentTarget;
    const formElements = form.elements as typeof form.elements & {
      firstname: { value: string };
      lastname: { value: string };
      email: { value: string };
    };

    const user: UserType = {
      email: formElements.email.value,
      name: formElements.firstname.value + " " + formElements.lastname.value,
      mobileNumber: mobile,
      instagramHandle: instagramHandle,
      role: "user",
    };

    await updateUserAccount(user)
      .then(() => {
        setToast({ message: "Account saved", variant: "success", show: true });
        fetchData();
      })
      .catch((err) => {
        console.log("Error saving account", err);
        setToast({
          message: "Error saving account",
          variant: "error",
          show: true,
        });
      })
      .finally(() => {
        setIsSaving(false);
        setIsEditMode(false);
      });
  };

  const SaveButton = () => {
    return (
      <>
        {isSaving ? (
          <div className="flex items-center justify-center w-2/3">
            <Spinner message="Saving..." />
          </div>
        ) : (
          <>
            <div className="mt-8 flex">
              <Button
                type="submit"
                disabled={isSaving || photoWarningText}
                className="rounded-md bg-indigo-500 px-3 py-2 text-sm font-semibold shadow-sm enable:hover:bg-indigo-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
              >
                {isSaving ? "Saving..." : "Save"}
              </Button>
            </div>
          </>
        )}
      </>
    );
  };

  return (
    <main>
      <Toast toast={toast} setToast={setToast} />
      <div className="bg-white mx-auto grid max-w-7xl grid-cols-1 gap-x-8 gap-y-10 px-4 py-16 sm:px-6 md:grid-cols-3 lg:px-8">
        <div>
          <h2 className="text-base font-semibold leading-7">
            Account Information
          </h2>
          <p className="mt-1 text-sm leading-6 text-gray-400">
            Account information is important to verify who you are
          </p>
        </div>

        <form className="md:col-span-2" onSubmit={onSubmit}>
          <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:max-w-xl sm:grid-cols-6">
            <div className="col-span-full flex items-center gap-x-8">
              <img
                alt="Profile image"
                src={profileImage}
                className="h-24 w-24 flex-none rounded-lg bg-gray-800 object-cover"
                referrerPolicy="no-referrer"
              />
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
                  onChange={(e) =>
                    setFirstName((e.target as HTMLInputElement).value)
                  }
                  id="firstname"
                  name="firstname"
                  type="text"
                  disabled={!isEditMode}
                  required
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
                  onChange={(e) =>
                    setLastName((e.target as HTMLInputElement).value)
                  }
                  id="lastname"
                  name="lastname"
                  type="text"
                  disabled={!isEditMode}
                  required
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
                className="block text-sm font-medium leading-6"
              >
                Mobile
              </label>
              <div className="mt-2">
                <div className="flex rounded-md bg-white/5 ring-1 ring-inset ring-white/10 focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-500">
                  <Input
                    value={mobile}
                    onChange={(e) =>
                      setMobile((e.target as HTMLInputElement).value)
                    }
                    id="mobile"
                    name="mobile"
                    type="number"
                    disabled={!isEditMode}
                    className=""
                    required
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
                    onChange={(e) => {
                      const value = (e.target as HTMLInputElement).value;
                      setInstagramHandle(value.replace(/@/g, ""));
                    }}
                    id="instagramHandle"
                    name="instagramHandle"
                    disabled={!isEditMode}
                    type="text"
                    className=""
                  />
                </div>
              </div>
            </div>
          </div>

          {!isEditMode ? (
            <div className="mt-8 flex">
              <Button
                onClick={() => setIsEditMode(true)}
                disabled={isSaving || photoWarningText}
                className="rounded-md bg-indigo-500 px-3 py-2 text-sm font-semibold shadow-sm enable:hover:bg-indigo-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
              >
                Edit
              </Button>
            </div>
          ) : (
            <SaveButton />
          )}
        </form>
      </div>
    </main>
  );
};

export default Account;
