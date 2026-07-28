"use client";

import LoginComponent from "@/components/Login";
import * as React from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import Toast, { ToastType, ToastVariant } from "@/components/Toast";

const LoginPage = () => {
  const { status } = useSession();
  const router = useRouter();
  const [toast, setToast] = React.useState<ToastType>({
    message: "",
    variant: ToastVariant.SUCCESS,
    show: false,
  });

  React.useEffect(() => {
    if (status === "authenticated") router.replace("/");
  }, [status, router]);

  React.useEffect(() => {
    if (router.query.accountCreated === "true") {
      setToast({
        message: "Account created successfully! You can now log in.",
        variant: ToastVariant.SUCCESS,
        show: true,
      });
      router.replace("/login");
    } else if (router.query.passwordReset === "true") {
      setToast({
        message: "Password updated successfully! You can now log in.",
        variant: ToastVariant.SUCCESS,
        show: true,
      });
      router.replace("/login");
    }
  }, [router]);

  if (status === "loading" || status === "authenticated") return null;

  return (
    <>
      <Toast toast={toast} setToast={setToast} />
      <LoginComponent />
    </>
  );
};

export default LoginPage;
