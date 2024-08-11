import { AppProps } from "next/app";
import React from "react";
import "../styles/global.css";
import MobileNav from "@/components/MobileNav";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { SessionProvider } from "next-auth/react";
import UserContextProvider from "@/context/UserContext";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <SessionProvider session={pageProps.session}>
      <UserContextProvider>
        <Navigation />
        <MobileNav />
        <Component {...pageProps} />
        <Footer />
      </UserContextProvider>
    </SessionProvider>
  );
}
