import { NextApiRequest, NextApiResponse } from "next";
import { dbConnect } from "../../lib/db/db";
import { getBlockOutsByDress } from "../../lib/db/blockout-dao";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();

  const { dressId } = req.query;
  if (!dressId || typeof dressId !== "string") {
    return res.status(400).json({ message: "dressId query param is required" });
  }

  await dbConnect();
  const blockOuts = await getBlockOutsByDress(dressId);
  return res.status(200).json(blockOuts);
}
