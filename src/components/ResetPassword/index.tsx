"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useSearchParams } from "next/navigation";
import Input from "@/components/Input";
import Button from "@/components/Button";
import { resetPassword } from "@/api/user";
import { MIN_PASSWORD_LENGTH } from "../../../common/constants/auth";

export default function ResetPassword() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams?.get("token") ?? "";

  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [done, setDone] = React.useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const formData = new FormData(event.currentTarget);
    const password = formData.get("password") as string;
    const confirm = formData.get("confirm") as string;

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }

    setIsLoading(true);
    try {
      await resetPassword(token, password);
      setDone(true);
      setTimeout(() => router.replace("/login"), 1500);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ??
          "Could not reset your password. The link may have expired.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="bg-white flex flex-1 flex-col justify-center px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-sm">
        <h2 className="mt-10 text-center text-2xl font-bold leading-9 tracking-tight text-gray-900">
          Choose a new password
        </h2>
      </div>

      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
        <div className="sm:rounded-5xl mt-2 flex-auto bg-white shadow-2xl shadow-gray-900/10 py-8 px-4">
          {!token ? (
            <p className="text-sm text-center text-gray-600">
              This reset link is invalid.{" "}
              <Link
                href="/forgot-password"
                className="font-medium text-indigo-600 hover:text-indigo-500"
              >
                Request a new one
              </Link>
              .
            </p>
          ) : done ? (
            <p className="text-sm text-center text-gray-600">
              Your password has been updated. Redirecting you to sign in...
            </p>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="space-y-2 mb-4">
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="New password"
                  autoComplete="new-password"
                  required
                />
              </div>
              <div className="space-y-2 mb-4">
                <Input
                  id="confirm"
                  name="confirm"
                  type="password"
                  placeholder="Confirm new password"
                  autoComplete="new-password"
                  required
                />
              </div>

              {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

              <Button
                type="submit"
                color="gray"
                className="mt-2 w-full"
                disabled={isLoading}
              >
                {isLoading ? "Updating..." : "Update password"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
