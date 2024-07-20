import { AppProps } from "next/app";
import React from "react";
import "../styles/global.css";
import MobileNav from "@/components/MobileNav";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { SessionProvider } from "next-auth/react";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <SessionProvider session={pageProps.session}>
      <Navigation />
      <MobileNav />
      <Component {...pageProps} />
      <Footer />
    </SessionProvider>
  );
}
