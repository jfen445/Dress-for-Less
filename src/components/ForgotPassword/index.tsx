"use client";

import * as React from "react";
import Link from "next/link";
import Input from "@/components/Input";
import Button from "@/components/Button";
import { requestPasswordReset } from "@/api/user";

export default function ForgotPassword() {
  const [isLoading, setIsLoading] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);

    const formData = new FormData(event.currentTarget);
    const email = formData.get("email") as string;

    try {
      await requestPasswordReset(email);
    } catch {
      // Response is intentionally generic; ignore errors so the outcome can't
      // be probed from the UI either.
    }

    setIsLoading(false);
    setSubmitted(true);
  }

  return (
    <div className="bg-white flex flex-1 flex-col justify-center px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-sm">
        <h2 className="mt-10 text-center text-2xl font-bold leading-9 tracking-tight text-gray-900">
          Reset your password
        </h2>
      </div>

      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
        <div className="sm:rounded-5xl mt-2 flex-auto bg-white shadow-2xl shadow-gray-900/10 py-8 px-4">
          {submitted ? (
            <p className="text-sm text-center text-gray-600">
              If an account exists for that email, we&apos;ve sent a link to
              reset your password. Check your inbox.
            </p>
          ) : (
            <>
              <p className="mb-4 text-sm text-gray-600">
                Enter your email and we&apos;ll send you a link to reset your
                password.
              </p>
              <form onSubmit={handleSubmit}>
                <div className="space-y-2 mb-4">
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="hello@me.com"
                    autoComplete="email"
                    required
                  />
                </div>
                <Button
                  type="submit"
                  color="gray"
                  className="mt-2 w-full"
                  disabled={isLoading}
                >
                  {isLoading ? "Sending..." : "Send reset link"}
                </Button>
              </form>
            </>
          )}

          <p className="mt-4 text-center text-sm text-gray-600">
            <Link
              href="/login"
              className="font-medium text-secondary-pink hover:text-indigo-500"
            >
              Back to sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
