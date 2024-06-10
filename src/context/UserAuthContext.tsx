"use client";

import * as React from "react";
import { UserType } from "../../common/types";
import { logUserIn, signUp } from "@/api/user";
import { AxiosResponse } from "axios";

interface AuthCtx {
  user: UserType | null;
  signup: (user: UserType) => Promise<AxiosResponse<any, any> | undefined>;
  login: (
    email: string,
    password: string
  ) => Promise<AxiosResponse<any, any> | undefined>;
  setUser: React.Dispatch<React.SetStateAction<UserType | null>>;
  // changePassword: (password: string) => Promise<void> | undefined;
  // logUserOut: () => Promise<void>;
  // token: string;
  // setPreventAuthUpdate: (val:boolean) => void;
}

const userAuthContext = React.createContext<AuthCtx>({} as AuthCtx);

const UserAuthContextProvider = ({ children }: React.PropsWithChildren) => {
  const [user, setUser] = React.useState<UserType | null>(null);

  const signup = (user: UserType) => {
    return signUp(user);
  };

  const login = (email: string, password: string) => {
    return logUserIn(email, password);
  };

  return (
    <userAuthContext.Provider
      value={{
        user,
        signup,
        login,
        setUser,
      }}
    >
      {children}
    </userAuthContext.Provider>
  );
};

export function useUserAuth() {
  return React.useContext(userAuthContext);
}

export default UserAuthContextProvider;
