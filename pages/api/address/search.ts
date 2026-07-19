import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { NZPostApiError, searchAddresses } from "../../../lib/nzpost/client";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const q = (req.query.q as string) ?? "";
  const countParam = parseInt((req.query.count as string) ?? "8", 10);
  const count = Math.min(Number.isNaN(countParam) ? 8 : countParam, 10);

  if (q.trim().length < 3) {
    return res.status(200).json({ addresses: [] });
  }

  try {
    const addresses = await searchAddresses(q.trim(), count);
    return res.status(200).json({ addresses });
  } catch (err) {
    console.error("NZ Post address search failed", err);
    const status = err instanceof NZPostApiError ? 502 : 500;
    return res.status(status).json({
      message:
        "Address lookup is temporarily unavailable. You can enter your address manually.",
    });
  }
}
