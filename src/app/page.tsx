"use client";
import Image from "next/image";
import { getProfile } from "../../sanity/sanity.query";
import HomePage from "../components/HomePage";
import MobileNav from "@/components/MobileNav";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import UserAuthContextProvider from "@/context/UserAuthContext";
import UserContextProvider, { useUserContext } from "@/context/UserContext";

export default function Home() {
  const { userInfo } = useUserContext();

  console.log("userrrr", userInfo);
  return (
    <main className="bg-white">
      <HomePage />
    </main>
  );
}
