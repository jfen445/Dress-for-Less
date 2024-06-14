import { inject } from "mobx-react";
import { observer } from "mobx-react-lite";
import { NextPage } from "next";
import { DataStore } from "../src/stores/DataStore";
import HomePage from "@/components/HomePage";

type Props = {
  dataStore?: DataStore;
};

const IndexPage: NextPage = inject("dataStore")(
  observer((props: Props) => {
    const dataStore = props.dataStore!;

    return (
      <main className="bg-white">
        <HomePage />
      </main>
    );
  })
);
export default IndexPage;
