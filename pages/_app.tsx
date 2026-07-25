import { AppProps } from "next/app";
import React from "react";
import { useRouter } from "next/router";
import "../lib/utils/timezone";
import "../styles/global.css";
import MobileNav from "@/components/MobileNav";
import NavigationBar from "@/components/Navigation";
import Footer from "@/components/Footer";
import { SessionProvider } from "next-auth/react";
import UserContextProvider from "@/context/UserContext";
import Head from "next/head";
import Seo from "@/components/Seo";
import NavigationContextProvider from "@/context/NavigationContext";
import GlobalContextProvider from "@/context/GlobalContext";
import ComingSoon from "@/components/ComingSoon";
import { CartProvider } from "@/context/CartContext";

export default function App({ Component, pageProps }: AppProps) {
  const isComingSoon = process.env.NEXT_PUBLIC_COMING_SOON;
  const router = useRouter();

  return (
    <SessionProvider session={pageProps.session}>
      <GlobalContextProvider
        initialDresses={pageProps.dresses}
        initialFaq={pageProps.faq}
      >
        <UserContextProvider>
          <CartProvider>
            <div className="min-h-screen bg-white">
              <Head>
                <link rel="icon" href="/favicon.ico" />
              </Head>
              <Seo
                title="Dress for Less"
                description="Hire designer dresses for weddings, races, and events across New Zealand. Affordable, sustainable dress rental from Dress for Less."
                path={router.asPath}
              />
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
