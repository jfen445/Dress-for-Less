import dayjs from "dayjs";
import { auckland } from "./timezone";

export const getOrdinalSuffix = (day: number): string => {
  if (day % 10 === 1 && day !== 11) return "st";
  if (day % 10 === 2 && day !== 12) return "nd";
  if (day % 10 === 3 && day !== 13) return "rd";
  return "th";
};

export const formatBookingDate = (date: dayjs.ConfigType): string => {
  const d = auckland.toZone(date);
  return `${d.format("dddd")} ${d.date()}${getOrdinalSuffix(d.date())} ${d.format("MMMM")}`;
};
