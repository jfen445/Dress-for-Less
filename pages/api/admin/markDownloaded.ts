import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { dbConnect } from "../../../lib/db/db";
import { findUser } from "../../../lib/db/user-dao";
import { BookingSchema } from "../../../lib/db/schema";
import { AccountType } from "../../../common/enums/AccountType";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST")
    return res.status(405).json({ message: "Method not allowed" });

  await dbConnect();

  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  const userEmail = session.user.email;
  if (!userEmail)
    return res.status(401).json({ message: "User email not found in session" });

  const adminUser = await findUser(userEmail.toString());
  if (adminUser.length === 0 || adminUser[0].role !== AccountType.Admin)
    return res.status(403).json({ message: "Forbidden: Admins only" });

  const { bookingIds } = req.body as { bookingIds: string[] };
  if (!bookingIds?.length)
    return res.status(400).json({ message: "No booking IDs provided" });

  await BookingSchema.updateMany(
    { _id: { $in: bookingIds } },
    { downloadedAt: new Date() },
  );

  res.status(200).json({ message: "Bookings marked as downloaded" });
}
