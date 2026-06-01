import { NextApiRequest, NextApiResponse } from "next";
import { dbConnect } from "../../../lib/db/db";
import { findAllUsers } from "../../../lib/db/user-dao";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { findUser } from "../../../lib/db/user-dao";
import { AccountType } from "../../../common/enums/AccountType";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  await dbConnect();

  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const userEmail = session.user.email;
  if (!userEmail) {
    return res.status(401).json({ message: "User email not found in session" });
  }

  const user = await findUser(userEmail.toString());
  if (user.length === 0 || user[0].role !== AccountType.Admin) {
    return res.status(403).json({ message: "Forbidden: Admins only" });
  }

  if (req.method === "GET") {
    const allUsers = await findAllUsers();
    res.status(200).json(allUsers);
  }
}
