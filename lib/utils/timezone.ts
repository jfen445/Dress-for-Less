import dayjs, { Dayjs } from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

// A string with no "Z"/offset suffix carries no absolute-instant info (e.g. a
// plain "YYYY-MM-DD" from a date picker, or an offset-less datetime). Such
// strings must be parsed AS wall-clock time in the target zone (dayjs.tz(input, tz))
// rather than parsed in the runtime's ambient local zone and then converted
// (dayjs(input).tz(tz)) — the latter silently depends on the server/browser's
// local clock, which is exactly the bug this module exists to prevent.
function isNaiveDateString(input: unknown): input is string {
  return typeof input === "string" && !/[Zz]|[+-]\d{2}:?\d{2}$/.test(input);
}

function createTzHelpers(tz: string) {
  const toZone = (input?: dayjs.ConfigType): Dayjs =>
    isNaiveDateString(input) ? dayjs.tz(input, tz) : dayjs(input).tz(tz);

  return {
    tz,
    now: (): Dayjs => dayjs().tz(tz),
    toZone,
    startOfDay: (input?: dayjs.ConfigType): Dayjs => toZone(input).startOf("day"),
    endOfDay: (input?: dayjs.ConfigType): Dayjs => toZone(input).endOf("day"),
    format: (input?: dayjs.ConfigType, fmt = "YYYY-MM-DD"): string =>
      toZone(input).format(fmt),
    isSameDay: (a: dayjs.ConfigType, b: dayjs.ConfigType): boolean =>
      toZone(a).isSame(toZone(b), "day"),
  };
}

export const AUCKLAND_TZ = "Pacific/Auckland";
export const auckland = createTzHelpers(AUCKLAND_TZ);
export { dayjs, createTzHelpers };
