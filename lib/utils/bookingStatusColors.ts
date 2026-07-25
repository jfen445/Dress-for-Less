import { BookingStatus } from "../../common/enums/BookingStatus";

// Badge pill classes (bg/text/ring) for a booking status — shared so the
// bookings list and the dresses list render identical status colors.
export function getStatusColour(status: BookingStatus): string {
  switch (status) {
    case BookingStatus.BeingReturned:
      return "bg-purple-200 text-purple-900 ring-purple-700/30";
    case BookingStatus.Washing:
      return "bg-blue-200 text-blue-900 ring-blue-700/30";
    case BookingStatus.Drying:
      return "bg-lime-200 text-lime-900 ring-lime-700/30";
    case BookingStatus.Packed:
      return "bg-green-300 text-green-950 ring-green-800/40";
    case BookingStatus.Delayed:
      return "bg-red-200 text-red-900 ring-red-700/30";
    case BookingStatus.Reparing:
      return "bg-stone-200 text-stone-900 ring-stone-700/30";
    case BookingStatus.Returned:
      return "bg-teal-200 text-teal-900 ring-teal-700/30";
    case BookingStatus.NA:
      return "bg-gray-200 text-gray-900 ring-gray-700/30";
    default:
      return "";
  }
}
