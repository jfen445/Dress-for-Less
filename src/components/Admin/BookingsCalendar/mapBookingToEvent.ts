import { Booking, BookingItem } from "../../../../common/types";
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

// Each status gets its own SchedulerEventColor token so the CSS variable
// overrides in styles/global.css (scoped to .booking-status-calendar) can
// give it an exact color without colliding with another status. The token
// names themselves don't need to semantically match — see global.css.
const statusColor = (status: BookingStatus): SchedulerEventColor => {
  switch (status) {
    case BookingStatus.BeingReturned:
      return "purple";
    case BookingStatus.Washing:
      return "blue";
    case BookingStatus.Drying:
      return "lime";
    case BookingStatus.Packed:
      return "green";
    case BookingStatus.Delayed:
      return "red";
    case BookingStatus.Reparing:
      return "grey";
    case BookingStatus.Returned:
      return "teal";
    case BookingStatus.NA:
      return "grey";
    default:
      return "indigo";
  }
};

const formatAddress = (item: BookingItem) => {
  const address = item.address;
  if (!address) return "";
  const line = address.apartment
    ? `${address.apartment}/${address.address}`
    : address.address;
  return `${line}, ${address.city}, ${address.country}, ${address.postCode}`;
};

export function mapBookingItemToEvent(
  booking: Booking,
  item: BookingItem,
): BookingCalendarEvent {
  const start = item.dateBooked;
  const end = item.dateBooked;
  const userName = booking.user?.[0]?.name ?? "Unknown";
  const dressName = item.dress?.name ?? "Dress";
  const address = formatAddress(item);

  return {
    id: item._id ?? `${booking._id}-${item.dressId}-${item.dateBooked}`,
    title: `${dressName} — ${userName} (${item.deliveryType})`,
    description: [
      `Size: ${item.size}`,
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
