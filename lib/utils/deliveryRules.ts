import { Dayjs } from "dayjs";
import { auckland } from "./timezone";
import { calculateBookingWindow } from "./bookingWindow";
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

// Cutoff for booking a given date/method is 8pm the day before that
// method's dispatch date (the conservative `blockedFrom` from bookingWindow).
function getBookingCutoff(dateStr: string, deliveryType: DeliveryType): Dayjs {
  const { blockedFrom } = calculateBookingWindow(dateStr, deliveryType);
  return auckland
    .toZone(blockedFrom)
    .subtract(1, "day")
    .hour(20)
    .minute(0)
    .second(0)
    .millisecond(0);
}

export function isDeliveryAllowedForDate(
  dateStr: string,
  now: Dayjs = auckland.now(),
): boolean {
  return now.isBefore(getBookingCutoff(dateStr, DeliveryType.Delivery));
}

export function isPickupAllowedForDate(
  dateStr: string,
  now: Dayjs = auckland.now(),
): boolean {
  return now.isBefore(getBookingCutoff(dateStr, DeliveryType.Pickup));
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
  now: Dayjs = auckland.now(),
): boolean {
  return deliveryType === DeliveryType.Pickup
    ? isPickupAllowedForDate(dateStr, now)
    : isDeliveryAllowedForDate(dateStr, now);
}
