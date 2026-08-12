import { NextApiRequest, NextApiResponse } from "next";
import { dbConnect } from "../../../lib/db/db";
import { findLapsedReservations } from "../../../lib/db/booking-dao";
import { findLapsedTryOnReservations } from "../../../lib/db/tryon-booking-dao";
import { lapsedReservationCutoff } from "../../../lib/utils/reservation";
import {
  reconcileReservation,
  type ReconcileOutcome,
} from "../../../lib/booking/reconcileReservation";
import { reconcileTryOnReservation } from "../../../lib/tryOn/reconcileTryOnReservation";

// Clears out reservations whose customer never came back — dress rentals and
// try-on slots alike, since both now hold their stock with an unpaid row.
//
// Not a delete job: an unpaid row can mean the customer walked away, or that
// they paid and the confirmation never ran, and those are indistinguishable
// without asking Stripe. reconcileReservation asks, and cancels or promotes
// accordingly. Anything it can't resolve keeps blocking its date until a later
// run — the safe direction to fail in.
//
// The reserve paths reconcile on demand too, so this running late (or not at
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

  const cutoff = lapsedReservationCutoff();

  const bookings = await sweep(
    await findLapsedReservations(cutoff),
    reconcileReservation,
  );

  const tryOns = await sweep(
    await findLapsedTryOnReservations(cutoff),
    reconcileTryOnReservation,
  );

  const promoted = bookings.promoted + tryOns.promoted;

  if (promoted > 0) {
    console.warn(
      `Sweep promoted ${promoted} paid reservation(s) that were never confirmed by the browser`,
    );
  }

  return res.status(200).json({ bookings, tryOns });
}

async function sweep(
  lapsed: string[],
  reconcile: (paymentIntent: string) => Promise<ReconcileOutcome>,
) {
  let cancelled = 0;
  let promoted = 0;
  let unresolved = 0;

  for (const paymentIntent of lapsed) {
    const outcome = await reconcile(paymentIntent);

    if (outcome === "cancelled") cancelled += 1;
    else if (outcome === "promoted") promoted += 1;
    else unresolved += 1;
  }

  return { examined: lapsed.length, cancelled, promoted, unresolved };
}
