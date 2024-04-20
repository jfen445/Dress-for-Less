"use client";

import { useFormStatus, useFormState } from "react-dom";

export function SignupButton() {
  const { pending } = useFormStatus();

  return (
    <button aria-disabled={pending} type="submit">
      {pending ? "Submitting..." : "Sign up"}
    </button>
  );
}
