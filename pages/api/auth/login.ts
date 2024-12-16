import { NextApiRequest, NextApiResponse } from "next";
import { dbConnect } from "../../../lib/db/db";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  await dbConnect();

  // const { email, password } = req.body;
  // // await signIn('credentials', { email, password })

  // const sessionData = req.body;
  // const encryptedSessionData = encrypt(sessionData);

  // const users = await findUser(email);

  // if (users.length === 0) {
  //   res.status(404).json({
  //     message: "Invalid account credentials",
  //   });
  // }

  // const match = await bcrypt.compareSync(password, users[0].password);

  // if (match) {
  //   const cookie = serialize("currentUser", await encryptedSessionData, {
  //     httpOnly: true,
  //     secure: process.env.NODE_ENV === "production",
  //     maxAge: 60 * 60, // One hour
  //     path: "/",
  //   });
  //   res.setHeader("Set-Cookie", cookie);
  //   res.status(200).json({ message: "Successfully set cookie!" });
  // } else {
  //   res.status(404).json({
  //     message: "Invalid account credentials",
  //   });
  // }
}
