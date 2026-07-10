export const TRY_ON_TIME_SLOTS = [
  "18:00",
  "18:30",
  "19:00",
  "19:30",
  "20:00",
  "20:30",
];

export const TRY_ON_FEE = 15;

export function formatTryOnTimeSlot(timeSlot: string): string {
  const [hourStr, minuteStr] = timeSlot.split(":");
  const hour = parseInt(hourStr, 10);
  const period = hour >= 12 ? "pm" : "am";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:${minuteStr}${period}`;
}
