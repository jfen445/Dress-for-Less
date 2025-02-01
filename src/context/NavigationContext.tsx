import React, { Dispatch, SetStateAction } from "react";

interface NavigationContextProps {
  mobileNavOpen: boolean;
  setMobileNavOpen: Dispatch<SetStateAction<boolean>>;
}

const navigationContext = React.createContext<NavigationContextProps>(
  {} as NavigationContextProps
);

const NavigationContextProvider = ({ children }: React.PropsWithChildren) => {
  const [mobileNavOpen, setMobileNavOpen] = React.useState<boolean>(false);

  return (
    <navigationContext.Provider value={{ mobileNavOpen, setMobileNavOpen }}>
      {children}
    </navigationContext.Provider>
  );
};

export function useNavigationContext() {
  return React.useContext(navigationContext);
}

export default NavigationContextProvider;
