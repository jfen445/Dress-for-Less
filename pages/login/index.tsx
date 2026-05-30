"use client";

import LoginComponent from "@/components/Login";
import * as React from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";

const LoginPage = () => {
  const { status } = useSession();
  const router = useRouter();

  React.useEffect(() => {
    if (status === "authenticated") router.replace("/");
  }, [status]);

  if (status === "loading" || status === "authenticated") return null;

  return (
    <>
      <LoginComponent />
    </>
  );
};

export default LoginPage;
