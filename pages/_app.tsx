import { AppProps } from "next/app";
import React from "react";
import "../styles/global.css";
import MobileNav from "@/components/MobileNav";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { SessionProvider } from "next-auth/react";
import UserContextProvider from "@/context/UserContext";
import Head from "next/head";
import NavigationContextProvider from "@/context/NavigationContext";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <SessionProvider session={pageProps.session}>
      <UserContextProvider>
        <div className="min-h-screen bg-white">
          <Head>
            <title>Dress for Less</title>
          </Head>
          <NavigationContextProvider>
            <Navigation />
            <MobileNav />
          </NavigationContextProvider>
          <Component {...pageProps} />
        </div>
        <Footer />
      </UserContextProvider>
    </SessionProvider>
  );
}
