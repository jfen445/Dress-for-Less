import { dbConnect } from "../../lib/db/db";
import { NextApiRequest, NextApiResponse } from "next";
import { findAllUsers, findUser } from "../../lib/db/user-dao";
import { IUser } from "../../common/interfaces/user";
import { UserType } from "../../common/types";
import { UserSchema } from "../../lib/db/schema";
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import { AccountType } from "../../common/enums/AccountType";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const session = await getServerSession(req, res, authOptions);
  await dbConnect();

  if (req.method === "GET") {
    if (!session?.user?.email) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const [sessionUser] = await findUser(session.user.email);
    const isAdmin = sessionUser?.role === AccountType.Admin;

    const email = req.query.email as string;

    if (!email) {
      // Listing every user (PII: emails, phone numbers, handles) is admin-only.
      if (!isAdmin) {
        return res.status(403).json({ message: "Forbidden: Admins only" });
      }
      const allUsers = await findAllUsers();
      return res.status(200).json(allUsers);
    }

    // A user may only read their own record; admins may read anyone's.
    if (!isAdmin && email !== session.user.email) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const users = await findUser(email);
    if (users.length === 0) {
      return res.status(404).json({ message: "Account not found" });
    }

    return res.status(200).json(users[0] as UserType);
  } else if (req.method == "POST") {
    if (!session?.user?.email) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const [sessionUser] = await findUser(session.user.email);
    const isAdmin = sessionUser?.role === AccountType.Admin;

    const email: string = req.body.user?.email;
    if (!email) {
      return res.status(400).json({ message: "email is required" });
    }

    // A user may only update their own record; admins may update anyone's.
    if (!isAdmin && email !== session.user.email) {
      return res.status(403).json({ message: "Forbidden" });
    }

    let user: IUser = {
      email,
      name: req.body.user.name,
      mobileNumber: req.body.user.mobileNumber,
      instagramHandle: req.body.user.instagramHandle,
      photo: req.body.user.photo ?? "", // make photo optional for now
    };

    // No upsert: sign-in already creates the account row, so updating a
    // non-existent email here would only let a caller fabricate records.
    await UserSchema.updateOne({ email }, user);

    res.status(200).json({ message: "Account updated" });
  }
}
