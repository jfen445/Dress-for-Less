import { NextApiRequest, NextApiResponse } from "next";

import { serialize } from "cookie";
import { encrypt } from "../../../lib";
import { findUser } from "../../../lib/db/user-dao";
import { dbConnect } from "../../../lib/db/db";
import bcrypt from "bcrypt";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  await dbConnect();

  const { email, password } = req.body;
  // await signIn('credentials', { email, password })

  console.log("tester", email, password);

  const sessionData = req.body;
  const encryptedSessionData = encrypt(sessionData);

  const users = await findUser(email);

  if (users.length === 0) {
    res.status(404).json({
      message: "Invalid account credentials",
    });
  }

  const match = await bcrypt.compareSync(password, users[0].password);

  if (match) {
    const cookie = serialize("currentUser", await encryptedSessionData, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60, // One hour
      path: "/",
    });
    res.setHeader("Set-Cookie", cookie);
    res.status(200).json({ message: "Successfully set cookie!" });
  } else {
    res.status(404).json({
      message: "Invalid account credentials",
    });
  }
}
