import dayjs, { Dayjs } from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { DeliveryType } from "../../common/enums/DeliveryType";

dayjs.extend(utc);
dayjs.extend(timezone);

const NZ_TIMEZONE = "Pacific/Auckland";

export const SHIPPING_FEE = 15;

export function hasDeliveryItem(
  items: { deliveryType: DeliveryType | string }[],
): boolean {
  return items.some((item) => item.deliveryType === DeliveryType.Delivery);
}

export function isBeforeTuesday8pm(now: Dayjs = dayjs().tz(NZ_TIMEZONE)): boolean {
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
  now: Dayjs = dayjs().tz(NZ_TIMEZONE),
): boolean {
  const day = now.day(); // 0 (Sun) - 6 (Sat)
  const daysUntilSunday = day === 0 ? 0 : 7 - day;
  const currentSunday = now
    .add(daysUntilSunday, "day")
    .hour(23)
    .minute(59)
    .second(59)
    .millisecond(999);

  const date = dayjs.tz(dateStr, NZ_TIMEZONE);

  return !date.isBefore(now) && !date.isAfter(currentSunday);
}

export function isDeliveryAllowedForDate(
  dateStr: string,
  now: Dayjs = dayjs().tz(NZ_TIMEZONE),
): boolean {
  return !(
    isDateWithinCurrentWeekend(dateStr, now) && !isBeforeTuesday8pm(now)
  );
}
