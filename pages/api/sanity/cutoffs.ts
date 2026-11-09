import { NextApiRequest, NextApiResponse } from "next";
import { getBookingCutoffs } from "../../../sanity/sanity.query";

// Admin cut-off overrides for the browser's copy of the notice-from-today gate.
// A short cache: an edit should reach customers within a minute, and a tab that
// is staler than that is still caught by the reserve, which reads uncached.
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const cutoffs = await getBookingCutoffs();

    res.setHeader(
      "Cache-Control",
      "public, s-maxage=60, stale-while-revalidate=60",
    );
    return res.status(200).json(cutoffs);
  } catch (error) {
    console.error("Failed to load booking cutoffs", error);
    return res.status(502).json({ message: "Could not load booking cutoffs" });
  }
}
