"use client";
import LoginComponent from "@/components/Login";
import UserAuthContextProvider from "@/context/UserAuthContext";
import UserContextProvider from "@/context/UserContext";
import { DataStore } from "@/stores/DataStore";
import { inject, observer } from "mobx-react";
import { NextPage } from "next";
import * as React from "react";

const LoginPage = () => {
  return (
    <>
      <LoginComponent />
    </>
  );
};

export default LoginPage;

// import { FormEvent } from "react";
// import { redirect } from "next/navigation";

// export default function LoginPage() {
//   // async function handleSubmit(event: FormEvent<HTMLFormElement>) {
//   //   event.preventDefault();

//   //   const formData = new FormData(event.currentTarget);
//   //   const email = formData.get("email");
//   //   const password = formData.get("password");

//   //   const response = await fetch("/api/auth/login", {
//   //     method: "POST",
//   //     headers: { "Content-Type": "application/json" },
//   //     body: JSON.stringify({ email, password }),
//   //   });

//   //   if (response.ok) {
//   //     redirect("/");
//   //   } else {
//   //     // Handle errors
//   //   }
//   // }

//   return (
//     <form>
//       <input type="email" name="email" placeholder="Email" required />
//       <input type="password" name="password" placeholder="Password" required />
//       <button type="submit">Login</button>
//     </form>
//   );
// }
