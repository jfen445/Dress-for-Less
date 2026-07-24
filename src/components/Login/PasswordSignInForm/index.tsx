"use client";

import * as React from "react";
import { useRouter } from "next/router";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";

import Input from "@/components/Input";
import Button from "@/components/Button";

export default function PasswordSignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams?.get("callbackUrl") || "/account";

  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string>("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError("");

    const formData = new FormData(event.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl,
    });

    setIsLoading(false);

    if (result?.error) {
      // Generic message on purpose: never reveal whether the email exists.
      setError("Invalid email or password");
      return;
    }

    router.replace(callbackUrl);
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-2 mb-4">
        <Input
          id="credentials-email"
          name="email"
          type="email"
          placeholder="hello@me.com"
          autoComplete="email"
          required
        />
      </div>
      <div className="space-y-2 mb-4">
        <Input
          id="credentials-password"
          name="password"
          type="password"
          placeholder="Password"
          autoComplete="current-password"
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
        {isLoading ? "Signing in..." : "Sign in with password"}
      </Button>
    </form>
  );
}
