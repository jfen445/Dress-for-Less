import Image from "next/image";
import { ProfileType } from "../../types";
import { getProfile } from "../../sanity/sanity.query";
import HomePage from "../components/HomePage";
import MobileNav from "@/components/MobileNav";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";

export default async function Home() {
  const profile: ProfileType[] = await getProfile();

  return (
    <main className="bg-white">
      <HomePage />
    </main>
  );
}
