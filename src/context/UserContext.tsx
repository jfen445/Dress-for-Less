"use client";

import * as React from "react";
import { CartType, UserType } from "../../common/types";
import { getUser } from "@/api/user";
import { useSession } from "next-auth/react";
import useLocalStorage from "@/hooks/useLocalStorage";
import { addToCart, syncCart } from "@/api/cart";
// import { cookies } from "next/headers";
// import { setLoginCookie } from "../../lib";

const secretKey = "secret";
const key = new TextEncoder().encode(secretKey);

interface UserContextProps {
  userInfo: UserType | null;
  fetchData: () => void;
  getUserProfleImage: () => string;
}

const userContext = React.createContext<UserContextProps>(
  {} as UserContextProps
);

const UserContextProvider = ({ children }: React.PropsWithChildren) => {
  const [userInfo, setUserInfo] = React.useState<UserType | null>(null);
  const { getItems, clearItems } = useLocalStorage<CartType[]>("localCart");

  const { data: session } = useSession();

  const fetchData = React.useCallback(() => {
    if (session != null && session?.user.email) {
      getUser(session?.user.email)
        .then((res) => {
          if (res === undefined) return;
          const r = res.data as unknown as UserType;
          setUserInfo(r);
        })
        .catch((err) => console.error(err));
    }
  }, [session]);

  const getUserProfleImage = () => {
    if (session && session.user && session.user.image) {
      return session.user.image;
    } else if (userInfo && userInfo.photo) {
      return userInfo.photo;
    } else {
      return "https://www.gravatar.com/avatar/";
    }
  };

  React.useEffect(() => {
    const cartItems = getItems();

    if (!cartItems || !session || cartItems?.length == 0) {
      return;
    }

    const updatedCart = cartItems.map((item) => ({
      ...item,
      userId: userInfo?._id,
    }));

    syncCart(updatedCart)
      .then(() => {
        clearItems();
      })
      .catch((err) => {
        console.error(err);
      });
  }, [userInfo]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData, session]);

  return (
    <userContext.Provider value={{ userInfo, fetchData, getUserProfleImage }}>
      {children}
    </userContext.Provider>
  );
};

export function useUserContext() {
  return React.useContext(userContext);
}

export default UserContextProvider;
