import { NextApiRequest, NextApiResponse } from "next";
import { auckland } from "../../../lib/utils/timezone";
import { dbConnect } from "../../../lib/db/db";
import { getAllBlockOuts, createBlockOut, deleteBlockOut } from "../../../lib/db/blockout-dao";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { findUser } from "../../../lib/db/user-dao";
import { AccountType } from "../../../common/enums/AccountType";

async function requireAdmin(req: NextApiRequest, res: NextApiResponse): Promise<boolean> {
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  const user = await findUser(session.user.email ?? "");
  if (user.length === 0 || user[0].role !== AccountType.Admin) {
    res.status(403).json({ message: "Forbidden: Admins only" });
    return false;
  }
  return true;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await dbConnect();

  const isAdmin = await requireAdmin(req, res);
  if (!isAdmin) return;

  if (req.method === "GET") {
    const blockOuts = await getAllBlockOuts();
    return res.status(200).json(blockOuts);
  }

  if (req.method === "POST") {
    const { dressId, size, startDate, endDate, reason } = req.body;
    if (!dressId || !size || !startDate || !endDate) {
      return res.status(400).json({ message: "dressId, size, startDate, and endDate are required" });
    }
    if (startDate > endDate) {
      return res.status(400).json({ message: "startDate must be on or before endDate" });
    }
    const start = auckland.startOfDay(startDate).toISOString();
    const end = auckland.endOfDay(endDate).toISOString();
    const created = await createBlockOut({ dressId, size, startDate: start, endDate: end, reason });
    return res.status(201).json(created);
  }

  if (req.method === "DELETE") {
    const { id } = req.query;
    if (!id || typeof id !== "string") {
      return res.status(400).json({ message: "id query param is required" });
    }
    await deleteBlockOut(id);
    return res.status(204).end();
  }

  res.status(405).end();
}
