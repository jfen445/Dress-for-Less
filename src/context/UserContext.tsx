import * as React from "react";
import { UserType } from "../../common/types";
import { useUserAuth } from "./UserAuthContext";

interface UserContextProps {
  userInfo: UserType | null;
}

const userContext = React.createContext<UserContextProps>(
  {} as UserContextProps
);

const UserContextProvider = ({ children }: React.PropsWithChildren) => {
  const [userInfo, setUserInfo] = React.useState<UserType | null>(null);
  const { user } = useUserAuth();

  React.useEffect(() => {
    if (user != null) {
    }
  }, [user]);
  return (
    <userContext.Provider value={{ userInfo }}>{children}</userContext.Provider>
  );
};
