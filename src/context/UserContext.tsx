"use client";

import * as React from "react";
import { CartType, UserType } from "../../common/types";
import { getUser, updateUserAccount } from "@/api/user";
import { useSession } from "next-auth/react";
import useLocalStorage from "@/hooks/useLocalStorage";
import { syncCart } from "@/api/cart";
import { AccountType } from "../../common/enums/AccountType";
import { useCartContext } from "./CartContext";

interface UserContextProps {
  userInfo: UserType | null;
  fetchData: () => void;
  getUserProfileImage: () => string;
}

const userContext = React.createContext<UserContextProps>(
  {} as UserContextProps,
);

const UserContextProvider = ({ children }: React.PropsWithChildren) => {
  const [userInfo, setUserInfo] = React.useState<UserType | null>(null);
  const { getItems, clearItems } = useLocalStorage<CartType[]>("localCart");
  const { refreshCart } = useCartContext();
  55;
  const { data: session } = useSession();

  const fetchData = React.useCallback(async () => {
    if (session != null && session?.user.email) {
      getUser(session?.user.email)
        .then((res) => {
          if (res === undefined) return;
          const r = res.data as unknown as UserType;
          setUserInfo(r);
        })
        .catch((err) => console.error(err));
    }

    if (session && userInfo == null && !session?.user.email) {
      await updateUserAccount({
        email: session?.user.email ?? "",
        name: session?.user.name || "",
        mobileNumber: "",
        instagramHandle: "",
        role: AccountType.User,
      })
        .then((res) => {
          const newUser = res.data as unknown as UserType;
          setUserInfo(newUser);
        })
        .catch((err) => console.error(err));
    }
  }, [session]);

  const getUserProfileImage = () => {
    let letter = "D";
    if (session?.user?.name && session.user.name.length > 0) {
      letter = session.user.name.charAt(0).toUpperCase();
    } else if (session?.user?.email && session.user.email.length > 0) {
      letter = session.user.email.charAt(0).toUpperCase();
    }
    return makeLetterAvatar(letter);
  };

  const makeLetterAvatar = (
    letter: string,
    size = 100,
    bg = "#FFDCE6",
    fg = "#1F2937",
    font = "Arial, Helvetica, sans-serif",
  ) => {
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}' viewBox='0 0 ${size} ${size}'>
    <rect width='100%' height='100%' fill='${bg}' rx='8' ry='8'/>
    <text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-family='${font}' font-size='${Math.floor(
      size * 0.48,
    )}' fill='${fg}' font-weight='600'>${letter}</text>
  </svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
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
      })
      .finally(() => {
        refreshCart();
      });
  }, [userInfo]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData, session]);

  return (
    <userContext.Provider
      value={{
        userInfo,
        fetchData,
        getUserProfileImage,
      }}
    >
      {children}
    </userContext.Provider>
  );
};

export function useUserContext() {
  return React.useContext(userContext);
}

export default UserContextProvider;
