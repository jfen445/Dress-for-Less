import { NextApiRequest, NextApiResponse } from "next";
import { getFaq } from "../../../sanity/sanity.query";

let cachedData: any = null;
let lastFetched = 0;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const CACHE_DURATION = 3600000; // Cache for 1 hour
  const now = Date.now();

  if (!cachedData || now - lastFetched > CACHE_DURATION) {
    cachedData = await getFaq();
    lastFetched = now;
  }

  res.status(200).json(cachedData);
}
