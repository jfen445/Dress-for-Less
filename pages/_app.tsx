import App, { AppContext } from "next/app";
import React from "react";
import { Provider } from "mobx-react";
import { fetchInitialStoreState, DataStore } from "../src/stores/DataStore";
import "../styles/global.css";
import MobileNav from "@/components/MobileNav";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";

class MyApp extends App {
  state = {
    dataStore: new DataStore(),
  };

  // Fetching serialized(JSON) store state
  static async getInitialProps(appContext: AppContext) {
    const appProps = await App.getInitialProps(appContext);
    const initialStoreState = await fetchInitialStoreState();

    return {
      ...appProps,
      initialStoreState,
    };
  }

  // Hydrate serialized state to store
  static getDerivedStateFromProps(props: any, state: any) {
    state.dataStore.hydrate(props.initialStoreState);
    return state;
  }

  render() {
    const { Component, pageProps } = this.props;
    return (
      <Provider dataStore={this.state.dataStore}>
        <Navigation />
        <MobileNav />
        <Component {...pageProps} />
        <Footer />
      </Provider>
    );
  }
}
export default MyApp;
