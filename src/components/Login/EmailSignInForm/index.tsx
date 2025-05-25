"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";

import Input from "@/components/Input";
import Button from "@/components/Button";

export default function EmailSignInForm() {
  const [isLoading, setIsLoading] = React.useState(false);
  const searchParams = useSearchParams();
  const callbackUrl = searchParams?.get("callbackUrl") || "/account";

  async function handleSubmit(event: any) {
    setIsLoading(true);
    event.preventDefault();
    const formData = new FormData(event.target);
    const email = formData.get("email");
    signIn("email", { email }).finally(() => {
      setIsLoading(false);
    });
  }

  return (
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
        className="mt-4 w-full"
        disabled={isLoading}
      >
        {isLoading ? "Loading..." : "Continue with email"}
      </Button>
    </form>
  );
}
