// 📌 context/GlobalContext.tsx
import React from "react";
import { DressType, Faq } from "../../common/types";
import { getAllDresses } from "@/api/dress";
import { getAllFaq } from "@/api/faq";

interface GlobalProps {
  allDresses: DressType[];
  faq: Faq[];
  getDressWithId: (id: string) => DressType;
  getHomeScreenDresses: () => DressType[];
  getFavouriteDresses: () => DressType[];
}

const globalContext = React.createContext<GlobalProps>({} as GlobalProps);

const GlobalContextProvider = ({ children }: React.PropsWithChildren) => {
  const [allDresses, setAllDresses] = React.useState<DressType[]>([]);
  const [faq, setFaq] = React.useState<Faq[]>([]);

  React.useEffect(() => {
    async function fetchData() {
      await getAllDresses()
        .then((data) => {
          const dressData = data.data as unknown as DressType[];
          setAllDresses(dressData);
        })
        .catch((error) => console.error(error.data));

      await getAllFaq()
        .then((data) => {
          const faqData = data.data as unknown as Faq[];
          setFaq(faqData);
        })
        .catch((error) => console.error(error.data));
    }

    fetchData();
  }, []);

  const getDressWithId = (id: string) => {
    return allDresses.filter((dress) => dress._id == id)[0];
  };

  const getHomeScreenDresses = (count: number = 7) => {
    const shuffled = [...allDresses].sort(() => Math.random() - 0.5); // Shuffle the array
    return shuffled.slice(0, count); // Get the first 'count' elements
  };

  const getFavouriteDresses = (count: number = 3) => {
    const shuffled = [...allDresses].sort(() => Math.random() - 0.5); // Shuffle the array
    return shuffled.slice(0, count); // Get the first 'count' elements
  };

  return (
    <globalContext.Provider
      value={{
        allDresses,
        faq,
        getDressWithId,
        getHomeScreenDresses,
        getFavouriteDresses,
      }}
    >
      {children}
    </globalContext.Provider>
  );
};

export function useGlobalContext() {
  return React.useContext(globalContext);
}

export default GlobalContextProvider;
