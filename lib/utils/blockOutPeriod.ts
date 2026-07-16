import { auckland } from "./timezone";

export function calculateBlockOutPeriod(dateBooked: string): string[] {
  const date = auckland.toZone(dateBooked);
  const day = date.day(); // 0=Sun, 5=Fri, 6=Sat, 1-4=Mon-Thu

  if (day === 5) {
    return [
      date.format("YYYY-MM-DD"),
      date.add(1, "day").format("YYYY-MM-DD"),
      date.add(2, "day").format("YYYY-MM-DD"),
    ];
  } else if (day === 6) {
    return [
      date.subtract(1, "day").format("YYYY-MM-DD"),
      date.format("YYYY-MM-DD"),
      date.add(1, "day").format("YYYY-MM-DD"),
    ];
  } else if (day === 0) {
    return [
      date.subtract(2, "day").format("YYYY-MM-DD"),
      date.subtract(1, "day").format("YYYY-MM-DD"),
      date.format("YYYY-MM-DD"),
    ];
  } else if (day >= 1 && day <= 4) {
    const monday = date.subtract(day - 1, "day");
    return Array.from({ length: 7 }, (_, i) =>
      monday.add(i, "day").format("YYYY-MM-DD"),
    );
  }

  return [];
}
