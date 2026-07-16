import { NextApiRequest, NextApiResponse } from "next";
import { auckland } from "../../lib/utils/timezone";
import { dbConnect } from "../../lib/db/db";
import { getAllTryOnAvailability } from "../../lib/db/tryon-availability-dao";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await dbConnect();

  if (req.method !== "GET") {
    return res.status(405).end();
  }

  const today = auckland.now().format("YYYY-MM-DD");
  const all = await getAllTryOnAvailability();
  const dates = all
    .filter((a) => a.date >= today && a.timeSlots.length > 0)
    .map((a) => a.date);

  return res.status(200).json({ dates });
}
