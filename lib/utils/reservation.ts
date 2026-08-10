import { auckland, dayjs } from "./timezone";

// Checkout reserves before it charges: the coupon slot is claimed and the
// booking row written while the payment is still in flight, so that a coupon
// that has run out — or a dress that has just gone — stops the charge from
// happening at all rather than being discovered after the customer's money has
// moved. Both halves of that reservation share one lifetime, below.

// How long to leave a reservation alone before assuming its owner isn't coming
// back and asking Stripe what became of it. Generous enough to cover a slow 3DS
// challenge, since reconciling a payment that is still legitimately in progress
// would cancel it out from under the customer.
//
// This is *not* an expiry. A lapsed reservation keeps blocking its date; it has
// merely become eligible for reconciling. The date is freed only once Stripe has
// confirmed the payment can never happen — see lib/booking/reconcileReservation.ts.
export const RESERVATION_TTL_MINUTES = 15;

// A reservation created before this instant is eligible for reconciling.
export function lapsedReservationCutoff(
  now: string = auckland.now().toISOString(),
): string {
  return dayjs(now).subtract(RESERVATION_TTL_MINUTES, "minute").toISOString();
}

// When a reservation started now stops holding what it holds. The mirror image
// of the cutoff above, and used to stamp coupon claims so a held slot and the
// dress hold beside it lapse at the same moment rather than drifting apart.
export function reservationExpiry(
  now: string = auckland.now().toISOString(),
): string {
  return dayjs(now).add(RESERVATION_TTL_MINUTES, "minute").toISOString();
}
