import { NextApiRequest, NextApiResponse } from "next";
import { getFaq } from "../../../sanity/sanity.query";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const data = await getFaq();

  res.setHeader(
    "Cache-Control",
    "public, s-maxage=3600, stale-while-revalidate=86400"
  );
  res.status(200).json(data);
}
