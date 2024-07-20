import { observable, computed } from "mobx";
import { enableStaticRendering } from "mobx-react";
import { UserType } from "../../common/types";

const isServer = typeof window === "undefined";
// eslint-disable-next-line react-hooks/rules-of-hooks
enableStaticRendering(isServer);

type SerializedStore = {
  title: string;
  content: string;
};

export class DataStore {
  title: string | undefined = "title";

  hydrate(serializedStore: SerializedStore) {
    this.title = serializedStore.title != null ? serializedStore.title : "";
  }

  changeTitle(newTitle: string) {
    console.log("new", newTitle);
    this.title = newTitle;
  }

  getTitle() {
    console.log("gtting", this.title);
    return this.title;
  }
}

const dataStore = new DataStore();
export default dataStore;

export async function fetchInitialStoreState() {
  // You can do anything to fetch initial store state
  return {};
}
