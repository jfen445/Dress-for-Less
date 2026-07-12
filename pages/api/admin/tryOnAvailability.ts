import { NextApiRequest, NextApiResponse } from "next";
import { dbConnect } from "../../../lib/db/db";
import {
  getAllTryOnAvailability,
  upsertTryOnAvailability,
  deleteTryOnAvailability,
} from "../../../lib/db/tryon-availability-dao";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { findUser } from "../../../lib/db/user-dao";
import { AccountType } from "../../../common/enums/AccountType";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;

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
    const availability = await getAllTryOnAvailability();
    return res.status(200).json(availability);
  }

  if (req.method === "POST") {
    const { date, timeSlots } = req.body;
    if (!date || typeof date !== "string" || !DATE_RE.test(date)) {
      return res.status(400).json({ message: "date must be a YYYY-MM-DD string" });
    }
    if (!Array.isArray(timeSlots) || timeSlots.length === 0) {
      return res.status(400).json({ message: "timeSlots must be a non-empty array" });
    }
    if (!timeSlots.every((t) => typeof t === "string" && TIME_RE.test(t))) {
      return res.status(400).json({ message: "each timeSlot must be an HH:mm string" });
    }
    const sorted = [...new Set(timeSlots)].sort();
    const saved = await upsertTryOnAvailability(date, sorted);
    return res.status(200).json(saved);
  }

  if (req.method === "DELETE") {
    const { date } = req.query;
    if (!date || typeof date !== "string") {
      return res.status(400).json({ message: "date query param is required" });
    }
    await deleteTryOnAvailability(date);
    return res.status(204).end();
  }

  res.status(405).end();
}
