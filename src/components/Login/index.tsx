import { useRouter } from "next/navigation";
import * as React from "react";
import Toast from "../Toast";
import Link from "next/link";

import { useSession, signIn } from "next-auth/react";
import Button from "../Button";
import EmailSignInForm from "./EmailSignInForm";
import GoogleSignInButton from "./GoogleSignInButton";

const LoginComponent = () => {
  const { data: session } = useSession();

  return (
    <>
      <div className="bg-white flex flex-1 flex-col justify-center px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-sm">
          <h2 className="mt-10 text-center text-2xl font-bold leading-9 tracking-tight text-gray-900">
            {session && session.user
              ? `Welcome ${session && session.user ? session.user.name : ""}`
              : "Sign in to your account"}
          </h2>
        </div>

        <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
          {session ? (
            <Link href="/dresses" className="group -m-2 flex items-center p-2">
              <Button className="mx-auto w-full">Start browsing now!</Button>
            </Link>
          ) : (
            // <Button className="mx-auto w-full" onClick={() => signIn()}>
            //   Click here to sign on wtih Google
            // </Button>

            <div className="sm:rounded-5xl mt-2 flex-auto bg-white shadow-2xl shadow-gray-900/10 py-8 px-4">
              <EmailSignInForm />
              <div className="mx-auto my-10 flex w-full items-center justify-evenly before:mr-4 before:block before:h-px before:flex-grow before:bg-stone-400 after:ml-4 after:block after:h-px after:flex-grow after:bg-stone-400">
                or
              </div>
              <GoogleSignInButton />
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default LoginComponent;
