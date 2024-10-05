import { useRouter } from "next/navigation";
import * as React from "react";
import Toast from "../Toast";
import Link from "next/link";

import { useSession, signIn } from "next-auth/react";
import Button from "../Button";

const LoginComponent = () => {
  const { data: session } = useSession();
  const router = useRouter();
  const [err, setErr] = React.useState<boolean>(false);
  const [errorMessage, setErrorMessage] = React.useState<string>("");

  return (
    <>
      <div className="bg-white flex min-h-screen flex-1 flex-col justify-center px-6 py-12 lg:px-8">
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
          {session ? (
            <Link href="/dresses" className="group -m-2 flex items-center p-2">
              <Button className="mx-auto w-full">Start browsing now!</Button>
            </Link>
          ) : (
            <Button className="mx-auto w-full" onClick={() => signIn()}>
              Click here to sign on wtih Google
            </Button>
          )}
        </div>
      </div>
    </>
  );
};

export default LoginComponent;
