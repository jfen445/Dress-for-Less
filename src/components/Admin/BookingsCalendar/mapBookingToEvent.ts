import { Booking } from "../../../../common/types";
import { BookingStatus } from "../../../../common/enums/BookingStatus";

export type SchedulerEventColor =
  | "red"
  | "pink"
  | "purple"
  | "indigo"
  | "blue"
  | "teal"
  | "green"
  | "lime"
  | "amber"
  | "orange"
  | "grey";

export interface BookingCalendarEvent {
  id: string;
  title: string;
  description: string;
  start: string;
  end: string;
  allDay: true;
  readOnly: true;
  color: SchedulerEventColor;
}

const statusColor = (status: BookingStatus): SchedulerEventColor => {
  switch (status) {
    case BookingStatus.BeingReturned:
      return "purple";
    case BookingStatus.Washing:
      return "blue";
    case BookingStatus.Drying:
      return "lime";
    case BookingStatus.Packed:
      return "orange";
    case BookingStatus.Delayed:
      return "red";
    case BookingStatus.Reparing:
      return "grey";
    case BookingStatus.Returned:
      return "green";
    case BookingStatus.NA:
    default:
      return "grey";
  }
};

const formatAddress = (booking: Booking) => {
  const address = booking.address;
  if (!address) return "";
  const line = address.apartment
    ? `${address.apartment}/${address.address}`
    : address.address;
  return `${line}, ${address.city}, ${address.country}, ${address.postCode}`;
};

export function mapBookingToEvent(booking: Booking): BookingCalendarEvent {
  const start = booking.dateBooked;
  const end = booking.dateBooked;
  const userName = booking.user?.[0]?.name ?? "Unknown";
  const dressName = booking.dress?.name ?? "Dress";
  const address = formatAddress(booking);

  return {
    id: booking._id ?? `${booking.dressId}-${booking.dateBooked}`,
    title: `${dressName} — ${userName} (${booking.deliveryType})`,
    description: [
      `Size: ${booking.size}`,
      `Status: ${booking.status}`,
      address ? `Address: ${address}` : null,
    ]
      .filter(Boolean)
      .join(" • "),
    start,
    end,
    allDay: true,
    readOnly: true,
    color: statusColor(booking.status),
  };
}
