import { Dayjs } from "dayjs";
import { auckland } from "./timezone";
import { calculateWindowForEvent } from "./bookingWindow";
import { DeliveryType } from "../../common/enums/DeliveryType";

export const SHIPPING_FEE = 15;
export const RURAL_SURCHARGE = 5;

export function hasDeliveryItem(
  items: { deliveryType: DeliveryType | string }[],
): boolean {
  return items.some((item) => item.deliveryType === DeliveryType.Delivery);
}

// Callers pass in `isRuralDelivery` explicitly (rather than deriving it here
// from item/address data) so that the trust boundary is visible at each call
// site — pages/api/booking.ts in particular must pass a server-verified
// value, never a client-supplied one read back off item data.
export function calculateShippingFee(
  hasDelivery: boolean,
  isRuralDelivery: boolean,
): number {
  if (!hasDelivery) return 0;
  return SHIPPING_FEE + (isRuralDelivery ? RURAL_SURCHARGE : 0);
}

// An admin-set cut-off for event dates startDate..endDate (inclusive; endDate
// blank = one day), edited in Sanity as `bookingCutoff`. Each method's cut-off is
// an Auckland wall-clock date + "HH:mm"; one without a date is not set.
type WallClock = { date?: string; time?: string } | null;
export type CutoffOverride = {
  _id?: string;
  startDate: string;
  endDate?: string | null;
  deliveryCutoff?: WallClock;
  pickupCutoff?: WallClock;
};

const spanDays = (o: CutoffOverride) =>
  auckland.toZone(o.endDate ?? o.startDate).diff(auckland.toZone(o.startDate), "day");

// The override for one event date and method, or null for the computed rule.
// Each method resolves on its own: among entries covering the date that set
// *this* method, the shortest range wins (an exception carved out of a longer
// period), then the earliest cut-off. It can be later than the computed one.
export function resolveCutoffOverride(
  dateStr: string,
  deliveryType: DeliveryType,
  overrides: CutoffOverride[],
): Dayjs | null {
  const field = deliveryType === DeliveryType.Pickup ? "pickupCutoff" : "deliveryCutoff";
  const candidates = overrides
    .filter((o) => o.startDate <= dateStr && dateStr <= (o.endDate ?? o.startDate))
    .filter((o) => o[field]?.date && o[field]?.time)
    .map((o) => ({
      span: spanDays(o),
      at: auckland.toZone(`${o[field]!.date}T${o[field]!.time}`),
    }))
    .sort((a, b) => a.span - b.span || a.at.valueOf() - b.at.valueOf());
  return candidates[0]?.at ?? null;
}

// Cutoff for booking a given date/method: an admin override where one applies,
// otherwise 8pm the day before that method's dispatch date (the conservative
// `blockedFrom` from bookingWindow).
function getBookingCutoff(
  dateStr: string,
  deliveryType: DeliveryType,
  overrides: CutoffOverride[],
): Dayjs {
  const override = resolveCutoffOverride(dateStr, deliveryType, overrides);
  if (override) return override;
  const { blockedFrom } = calculateWindowForEvent(dateStr, deliveryType);
  return auckland
    .toZone(blockedFrom)
    .subtract(1, "day")
    .hour(20)
    .minute(0)
    .second(0)
    .millisecond(0);
}

// `overrides` is required, not defaulted: a call site that forgot it would
// silently ignore every admin cut-off rather than fail to compile.
export function isDeliveryAllowedForDate(
  dateStr: string,
  overrides: CutoffOverride[],
  now: Dayjs = auckland.now(),
): boolean {
  return now.isBefore(getBookingCutoff(dateStr, DeliveryType.Delivery, overrides));
}

export function isPickupAllowedForDate(
  dateStr: string,
  overrides: CutoffOverride[],
  now: Dayjs = auckland.now(),
): boolean {
  return now.isBefore(getBookingCutoff(dateStr, DeliveryType.Pickup, overrides));
}

// The notice-from-today gate for one item, dispatched on its own method. Every
// caller that asks "can this still be booked?" goes through here — the Calendar,
// the cart, the checkout form, and the reserve — so no path can be left behind
// the way Pickup once was. Non-Pickup methods (including the unused
// PickupDelivery/DeliveryPickup variants) take the Delivery cutoff, matching how
// bookingWindow.ts falls those variants back to the Post table.
export function isBookingAllowedForDate(
  dateStr: string,
  deliveryType: DeliveryType,
  overrides: CutoffOverride[],
  now: Dayjs = auckland.now(),
): boolean {
  return deliveryType === DeliveryType.Pickup
    ? isPickupAllowedForDate(dateStr, overrides, now)
    : isDeliveryAllowedForDate(dateStr, overrides, now);
}
