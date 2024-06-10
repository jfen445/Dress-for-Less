"use client";

import * as React from "react";
import { UserType } from "../../common/types";
import { useUserAuth } from "./UserAuthContext";
import { getUser } from "@/api/user";
import { SignJWT, jwtVerify } from "jose";
// import { cookies } from "next/headers";
// import { setLoginCookie } from "../../lib";

const secretKey = "secret";
const key = new TextEncoder().encode(secretKey);

interface UserContextProps {
  userInfo: UserType | null;
}

const userContext = React.createContext<UserContextProps>(
  {} as UserContextProps
);

// export async function encrypt(payload: any) {
//   return await new SignJWT(payload)
//     .setProtectedHeader({ alg: "HS256" })
//     .setIssuedAt()
//     .setExpirationTime("1 hour from now")
//     .sign(key);
// }

// export async function decrypt(input: string): Promise<any> {
//   console.log("iput", input);
//   const { payload } = await jwtVerify(input, key, {
//     algorithms: ["HS256"],
//   });
//   return payload;
// }

// export async function setLoginCookie(user: UserType) {
//   // Verify credentials && get the user

//   // Create the session
//   const expires = new Date(Date.now() + 10 * 1000);
//   const session = await encrypt({ user, expires });

//   // Save the session in a cookie
//   cookies().set("session", session, { expires, httpOnly: true });
// }

const UserContextProvider = ({ children }: React.PropsWithChildren) => {
  const [userInfo, setUserInfo] = React.useState<UserType | null>(null);
  const { user } = useUserAuth();
  console.log("redndere user", userInfo);
  React.useEffect(() => {
    console.log("hiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiii", user);
    if (user != null) {
      getUser(user.email).then((res) => {
        if (res === undefined) return;
        const r = res.data as unknown as UserType;
        console.log("RRRRRRRRRRRRRRRRR", r, res.data);
        setUserInfo(r);
      });
    }
  }, [user]);

  return (
    <userContext.Provider value={{ userInfo }}>{children}</userContext.Provider>
  );
};

export function useUserContext() {
  return React.useContext(userContext);
}

export default UserContextProvider;
