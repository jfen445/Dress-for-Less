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

export function isDateWithinCurrentWeekend(
  dateStr: string,
  now: Dayjs = auckland.now(),
): boolean {
  const day = now.day(); // 0 (Sun) - 6 (Sat)
  const daysUntilSunday = day === 0 ? 0 : 7 - day;
  const currentSunday = now
    .add(daysUntilSunday, "day")
    .hour(23)
    .minute(59)
    .second(59)
    .millisecond(999);

  const date = auckland.toZone(dateStr);

  return !date.isBefore(now) && !date.isAfter(currentSunday);
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
