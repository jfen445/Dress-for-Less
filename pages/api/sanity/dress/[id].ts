import { NextApiRequest, NextApiResponse } from "next";
import { getDress } from "../../../../sanity/sanity.query";

// A single dress, in the full projection. This is what backs the client-side id
// cache: the listing projection omits description/length/stretch/rrp, which the
// cart and checkout read, so those callers resolve through here rather than
// reusing a row they happen to have from a grid.
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { id } = req.query;
  if (typeof id !== "string" || id.length === 0) {
    return res.status(400).json({ message: "A dress id is required" });
  }

  try {
    const dress = await getDress(id);
    if (!dress) {
      return res.status(404).json({ message: "Dress not found" });
    }

    res.setHeader(
      "Cache-Control",
      "public, s-maxage=3600, stale-while-revalidate=86400",
    );
    return res.status(200).json(dress);
  } catch (error) {
    console.error(`Failed to load dress ${id}`, error);
    return res.status(502).json({ message: "Could not load dress" });
  }
}
