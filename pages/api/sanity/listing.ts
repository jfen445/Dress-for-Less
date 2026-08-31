import { NextApiRequest, NextApiResponse } from "next";
import { getDressPage } from "../../../sanity/sanity.query";
import { parseDressQuery } from "../../../lib/dresses/dressQuery";

// One page of the catalogue: /api/sanity/listing?page=&pageSize=&sort=&filter=
//
// Vercel's CDN keys on the full URL, so each filter/sort/page combination gets
// its own cache entry and Sanity still only sees each one hourly at most.
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ message: "Method not allowed" });
  }

  const query = parseDressQuery(req.query);

  try {
    const { items, total } = await getDressPage(query);

    res.setHeader(
      "Cache-Control",
      "public, s-maxage=3600, stale-while-revalidate=86400",
    );
    return res
      .status(200)
      .json({ items, total, page: query.page, pageSize: query.pageSize });
  } catch (error) {
    console.error("Failed to load dress listing", error);
    return res.status(502).json({ message: "Could not load dresses" });
  }
}
