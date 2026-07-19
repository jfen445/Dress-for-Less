import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { NZPostApiError, getAddressDetail } from "../../../lib/nzpost/client";

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

  const addressId = req.query.addressId as string;

  try {
    const address = await getAddressDetail(addressId);
    return res.status(200).json({ address });
  } catch (err) {
    console.error("NZ Post address detail lookup failed", { addressId, err });
    if (err instanceof NZPostApiError && err.status === 404) {
      return res.status(404).json({ message: "Address not found" });
    }
    const status = err instanceof NZPostApiError ? 502 : 500;
    return res.status(status).json({
      message:
        "Address lookup is temporarily unavailable. You can enter your address manually.",
    });
  }
}
