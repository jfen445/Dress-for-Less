import React, { Dispatch, SetStateAction } from "react";
import { DressType } from "../../common/types";
import { getAllDresses } from "../../sanity/sanity.query";

interface DressContextProps {
  dressList: DressType[];
  filteredDressList: DressType[];
  setFilteredDressList: Dispatch<SetStateAction<DressType[]>>;
  isLoading: Boolean;
  setIsLoading: (value: React.SetStateAction<Boolean>) => void;
}

const dressContext = React.createContext<DressContextProps>(
  {} as DressContextProps
);

const DressContextProvider = ({ children }: React.PropsWithChildren) => {
  const [dressList, setDressList] = React.useState<DressType[]>([]);
  const [filteredDressList, setFilteredDressList] = React.useState<DressType[]>(
    []
  );
  const [isLoading, setIsLoading] = React.useState<Boolean>(false);

  React.useEffect(() => {
    const fetchDresses = async () => {
      setIsLoading(true);
      await getAllDresses().then((data) => {
        setDressList(data);
      });
      setIsLoading(false);
    };

    fetchDresses();
  }, []);

  return (
    <dressContext.Provider
      value={{
        dressList,
        filteredDressList,
        setFilteredDressList,
        isLoading,
        setIsLoading,
      }}
    >
      {children}
    </dressContext.Provider>
  );
};

export function useDressContext() {
  return React.useContext(dressContext);
}

export default DressContextProvider;
