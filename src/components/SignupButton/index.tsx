"use client";

import { useFormStatus, useFormState } from "react-dom";
import Button from "@/components/Button";

export function SignupButton() {
  const { pending } = useFormStatus();

  return (
    <Button aria-disabled={pending} type="submit">
      {pending ? "Submitting..." : "Sign up"}
    </Button>
  );
}
