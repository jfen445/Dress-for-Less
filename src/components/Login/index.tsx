import { redirect, useRouter } from "next/navigation";
import * as React from "react";
import Toast from "../Toast";
import { getUser, logUserIn } from "@/api/user";
import { useUserAuth } from "@/context/UserAuthContext";
import { UserType } from "../../../common/types";
import { useUserContext } from "@/context/UserContext";
import Link from "next/link";

import { dataset } from "../../../sanity/env";
import { useSession, signIn, signOut } from "next-auth/react";
import Button from "../Button";

const LoginComponent = () => {
  const { data: session } = useSession();
  const router = useRouter();
  const { user, setUser, login } = useUserAuth();
  const { userInfo } = useUserContext();
  const [username, setUsername] = React.useState<String>("");
  const [password, setPassword] = React.useState<String>("");
  const [err, setErr] = React.useState<boolean>(false);
  const [errorMessage, setErrorMessage] = React.useState<string>("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const formElements = form.elements as typeof form.elements & {
      email: { value: string };
      password: { value: string };
    };

    const email = formElements.email.value;
    const password = formElements.password.value;

    await logUserIn(email, password)
      .then(async () => {
        await getUser(email).then((res) => {
          if (res === undefined) return;
          const r = res.data as unknown as UserType;
          setUser(r);
        });
        // router.push("/dresses");
      })
      .catch((err) => {
        setErrorMessage(err.message);
        setErr(true);
      });
  }

  console.log("why isthis nor working", session && session.user);
  return (
    <>
      <div className="bg-white flex min-h-full h-[80vh] flex-1 flex-col justify-center px-6 py-12 lg:px-8">
        <Toast
          show={err}
          setShow={setErr}
          title={errorMessage}
          variant="error"
        />
        <div className="sm:mx-auto sm:w-full sm:max-w-sm">
          <h2 className="mt-10 text-center text-2xl font-bold leading-9 tracking-tight text-gray-900">
            {session && session.user
              ? `Welcome ${session && session.user ? session.user.name : ""}`
              : "Sign in to your account"}
          </h2>
        </div>

        <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
          {/* <form className="space-y-6" method="POST" onSubmit={(e) => signIn()}>
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium leading-6 text-gray-900"
              >
                Email address
              </label>
              <div className="mt-2">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  onChange={(e) => setUsername(e.target.value)}
                  className="border border-rose-900 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="block text-sm font-medium leading-6 text-gray-900"
                >
                  Password
                </label>
                <div className="text-sm">
                  <a
                    href="#"
                    className="font-semibold text-secondary-pink hover:text-indigo-500"
                  >
                    Forgot password?
                  </a>
                </div>
              </div>
              <div className="mt-2">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  onChange={(e) => setPassword(e.target.value)}
                  className="border border-rose-900 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                // onClick={(e) => handleSubmit(e)}
                className="flex w-full justify-center rounded-md bg-primary-pink px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
              >
                Sign in
              </button>
            </div>
          </form> */}

          {session ? (
            <Link href="/dresses" className="group -m-2 flex items-center p-2">
              <Button className="mx-auto w-full">Start browsing now!</Button>
            </Link>
          ) : (
            <>
              <Button className="mx-auto w-full" onClick={() => signIn()}>
                Click here to sign on wtih Google
              </Button>
              <p className="mt-10 text-center text-sm text-gray-500">
                Not a member?{" "}
                <Link
                  href="/create"
                  className="font-semibold leading-6 text-indigo-600 hover:text-indigo-500"
                >
                  Create an account today
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default LoginComponent;
