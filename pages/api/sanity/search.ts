import { NextApiRequest, NextApiResponse } from "next";
import { searchDresses } from "../../../sanity/sanity.query";

// Typeahead search. Cached far more briefly than the listing — search terms are
// long-tailed, so a long TTL would fill the cache with entries nobody reuses.
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ message: "Method not allowed" });
  }

  const term = typeof req.query.q === "string" ? req.query.q : "";
  if (term.trim().length === 0) {
    return res.status(200).json([]);
  }

  try {
    const results = await searchDresses(term);

    res.setHeader(
      "Cache-Control",
      "public, s-maxage=300, stale-while-revalidate=3600",
    );
    return res.status(200).json(results);
  } catch (error) {
    console.error("Dress search failed", error);
    return res.status(502).json({ message: "Search is unavailable" });
  }
}
