import { NextApiRequest, NextApiResponse } from "next";

import { serialize } from "cookie";
import { encrypt } from "../../../lib";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { email, password } = req.body;
  // await signIn('credentials', { email, password })

  const sessionData = req.body;
  const encryptedSessionData = encrypt(sessionData);

  const cookie = serialize("session", await encryptedSessionData, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60, // One hour
    path: "/",
  });
  res.setHeader("Set-Cookie", cookie);
  res.status(200).json({ message: "Successfully set cookie!" });
}
