import { Dayjs } from "dayjs";
import { auckland } from "./timezone";
import { DeliveryType } from "../../common/enums/DeliveryType";

export const SHIPPING_FEE = 15;

export function hasDeliveryItem(
  items: { deliveryType: DeliveryType | string }[],
): boolean {
  return items.some((item) => item.deliveryType === DeliveryType.Delivery);
}

export function isBeforeTuesday8pm(now: Dayjs = auckland.now()): boolean {
  const day = now.day(); // 0 (Sun) - 6 (Sat)
  const daysSinceMonday = (day + 6) % 7;
  const tuesday8pm = now
    .subtract(daysSinceMonday, "day")
    .add(1, "day")
    .hour(20)
    .minute(0)
    .second(0)
    .millisecond(0);

  return now.isBefore(tuesday8pm);
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

export function isDeliveryAllowedForDate(
  dateStr: string,
  now: Dayjs = auckland.now(),
): boolean {
  return !(
    isDateWithinCurrentWeekend(dateStr, now) && !isBeforeTuesday8pm(now)
  );
}

export function isPickupAllowedForDate(
  dateStr: string,
  now: Dayjs = auckland.now(),
): boolean {
  const date = auckland.toZone(dateStr);
  const cutoff = date
    .subtract(2, "day")
    .hour(20)
    .minute(0)
    .second(0)
    .millisecond(0);

  return now.isBefore(cutoff);
}
