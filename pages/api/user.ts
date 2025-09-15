import { dbConnect, disconnect } from "../../lib/db/db";
import { NextApiRequest, NextApiResponse } from "next";
import { findAllUsers, findUser } from "../../lib/db/user-dao";
import { IUser } from "../../common/interfaces/user";
import { UserType } from "../../common/types";
import { UserSchema } from "../../lib/db/schema";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  await dbConnect();

  if (req.method === "GET") {
    const email = req.query.email as string;

    if (!email) {
      const allUsers = await findAllUsers();

      res.status(200).json(allUsers);

      return;
    }

    const users = await findUser(email);
    if (users.length === 0) {
      res.status(404).json({
        message: "Account not found",
      });
    }

    const userInfo = users[0] as UserType;

    res.status(200).json(userInfo);
  } else if (req.method == "POST") {
    const email: string = req.body.user.email;

    let user: IUser = {
      email: req.body.user.email,
      name: req.body.user.name,
      mobileNumber: req.body.user.mobileNumber,
      instagramHandle: req.body.user.instagramHandle,
      photo: req.body.user.photo,
    };

    const filter = { email: email };
    const options = { upsert: true };

    await UserSchema.updateOne(filter, user, options);

    res.status(200).json({ message: "Account created" });
  }
}
