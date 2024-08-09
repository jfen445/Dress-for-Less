import React from "react";
import Input from "../Input";
import { useSession } from "next-auth/react";
import Button from "../Button";
import router, { useRouter } from "next/router";
import { UserType } from "../../../common/types";
import { getUser } from "@/api/user";
import Toast from "../Toast";
import { redirect } from "next/navigation";

const Account = () => {
  const { push } = useRouter();
  const { data: session } = useSession();
  const [mobile, setMobile] = React.useState<string>("");
  const [instagramHandle, setInstagramHandle] = React.useState<string>("");
  const [alert, setAlert] = React.useState<boolean>(false);

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

  const profileImage =
    session && session.user && session.user.image ? session.user.image : "";

  React.useEffect(() => {
    const getCurrentUser = async () => {
      getUser(email).then((res) => {
        console.log("resulttt", res);
        if (res === undefined) return;

        const user = res.data as unknown as UserType;
        setMobile(user.mobileNumber);
        setInstagramHandle(user.instagramHandle ?? "");
      });
    };

    getCurrentUser();
  }, [email]);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const form = event.currentTarget;
    console.log("faefeawfaew", form);
    const formElements = form.elements as typeof form.elements & {
      firstname: { value: string };
      lastname: { value: string };
      email: { value: string };
      mobile: { value: string };
      instagramHandle: { value: string };
    };

    const user: UserType = {
      email: formElements.email.value,
      name: formElements.firstname.value + " " + formElements.lastname.value,
      mobileNumber: formElements.mobile.value,
      instagramHandle: formElements.instagramHandle.value ?? "",
    };

    await fetch("/api/user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user }),
    })
      .then((res) => {
        if (res.ok) {
          setAlert(true);
        }
        return res.json();
      })
      .then((data) => {
        console.log("eafdefd", data.message);
      })
      .catch((err) => {
        console.log("error", err);
      });
  };

  return (
    <main>
      <Toast
        show={alert}
        setShow={setAlert}
        title="Account saved"
        variant="success"
      />
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
                alt=""
                src={profileImage}
                className="h-24 w-24 flex-none rounded-lg bg-gray-800 object-cover"
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
                  id="firstname"
                  name="firstname"
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
                  id="lastname"
                  name="lastname"
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
                    onChange={(e) =>
                      setInstagramHandle((e.target as HTMLInputElement).value)
                    }
                    id="instagramHandle"
                    name="instagramHandle"
                    type="text"
                    className=""
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 flex">
            <Button
              type="submit"
              className="rounded-md bg-indigo-500 px-3 py-2 text-sm font-semibold   shadow-sm hover:bg-indigo-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
            >
              Save
            </Button>
          </div>
        </form>
      </div>
    </main>
  );
};

export default Account;
