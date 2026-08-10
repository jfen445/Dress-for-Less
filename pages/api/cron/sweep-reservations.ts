import { NextApiRequest, NextApiResponse } from "next";
import { dbConnect } from "../../../lib/db/db";
import { findLapsedReservations } from "../../../lib/db/booking-dao";
import { lapsedReservationCutoff } from "../../../lib/utils/reservation";
import { reconcileReservation } from "../../../lib/booking/reconcileReservation";

// Clears out reservations whose customer never came back.
//
// Not a delete job: an unpaid row can mean the customer walked away, or that
// they paid and the confirmation never ran, and those are indistinguishable
// without asking Stripe. reconcileReservation asks, and cancels or promotes
// accordingly. Anything it can't resolve keeps blocking its date until a later
// run — the safe direction to fail in.
//
// The reserve path reconciles on demand too, so this running late (or not at
// all) delays cleanup rather than taking dates out of sale.
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST")
    return res.status(405).json({ message: "Method not allowed" });

  const token = req.headers["authorization"]?.replace("Bearer ", "");

  if (!token || token !== process.env.CRON_SECRET)
    return res.status(401).json({ error: "Unauthorized" });

  await dbConnect();

  const lapsed = await findLapsedReservations(lapsedReservationCutoff());

  let cancelled = 0;
  let promoted = 0;
  let unresolved = 0;

  for (const paymentIntent of lapsed) {
    const outcome = await reconcileReservation(paymentIntent);

    if (outcome === "cancelled") cancelled += 1;
    else if (outcome === "promoted") promoted += 1;
    else unresolved += 1;
  }

  if (promoted > 0) {
    console.warn(
      `Sweep promoted ${promoted} paid reservation(s) that were never confirmed by the browser`,
    );
  }

  return res
    .status(200)
    .json({ examined: lapsed.length, cancelled, promoted, unresolved });
}
