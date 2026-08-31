import { NextApiRequest, NextApiResponse } from "next";
import { getCatalogue } from "../../../sanity/sanity.query";

// Every dress in one response. Only /admin asks for this — customer-facing
// screens use /api/sanity/listing for a page at a time, or
// /api/sanity/dress/[id] for one. Named for what it is, so the difference from
// the paged endpoint is visible at the call site.
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const dresses = await getCatalogue();

    res.setHeader(
      "Cache-Control",
      "public, s-maxage=3600, stale-while-revalidate=86400",
    );
    return res.status(200).json(dresses);
  } catch (error) {
    console.error("Failed to load the catalogue", error);
    return res.status(502).json({ message: "Could not load dresses" });
  }
}
