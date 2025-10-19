import { AppProps } from "next/app";
import React from "react";
import "../styles/global.css";
import MobileNav from "@/components/MobileNav";
import NavigationBar from "@/components/Navigation";
import Footer from "@/components/Footer";
import { SessionProvider } from "next-auth/react";
import UserContextProvider from "@/context/UserContext";
import Head from "next/head";
import NavigationContextProvider from "@/context/NavigationContext";
import GlobalContextProvider from "@/context/GlobalContext";
import ComingSoon from "@/components/ComingSoon";
import { CartProvider } from "@/context/CartContext";

export default function App({ Component, pageProps }: AppProps) {
  const isComingSoon = process.env.NEXT_PUBLIC_COMING_SOON;

  return (
    <SessionProvider session={pageProps.session}>
      <GlobalContextProvider>
        <UserContextProvider>
          <CartProvider>
            <div className="min-h-screen bg-white">
              <Head>
                <title>Dress for Less</title>
              </Head>
              {isComingSoon === "true" ? (
                <ComingSoon />
              ) : (
                <>
                  <NavigationContextProvider>
                    <NavigationBar />
                    <MobileNav />
                  </NavigationContextProvider>
                  <Component {...pageProps} />
                </>
              )}
            </div>
            <Footer />
          </CartProvider>
        </UserContextProvider>
      </GlobalContextProvider>
    </SessionProvider>
  );
}
