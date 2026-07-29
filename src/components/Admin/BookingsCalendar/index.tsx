import React from "react";
import { EventCalendar } from "@mui/x-scheduler/event-calendar";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useAdminBooking } from "@/context/AdminBookingContext";
import { DeliveryType } from "../../../../common/enums/DeliveryType";
import { BookingStatus } from "../../../../common/enums/BookingStatus";
import { mapBookingItemToEvent } from "./mapBookingToEvent";

interface IAdminBookingsCalendar {
  deliveryType: DeliveryType[];
}

const AdminBookingsCalendar = ({ deliveryType }: IAdminBookingsCalendar) => {
  const { bookings, thisWeekBookings, pastBookings } = useAdminBooking();
  const isMobile = useMediaQuery("(max-width:639px)");

  const events = React.useMemo(() => {
    const all = [...pastBookings, ...thisWeekBookings, ...bookings];
    const pairs = all.flatMap((booking) => {
      const items = deliveryType?.length
        ? booking.items.filter((item) =>
            deliveryType.includes(item.deliveryType as DeliveryType),
          )
        : booking.items;
      return items.map((item) => ({ booking, item }));
    });

    // Packed bookings sink to the bottom of each day's event list.
    const sorted = [...pairs].sort((a, b) => {
      const aPacked = a.booking.status === BookingStatus.Packed;
      const bPacked = b.booking.status === BookingStatus.Packed;
      if (aPacked === bPacked) return 0;
      return aPacked ? 1 : -1;
    });

    return sorted.map(({ booking, item }) => mapBookingItemToEvent(booking, item));
  }, [bookings, thisWeekBookings, pastBookings, deliveryType]);

  return (
    <div className="p-4 pb-8 sm:px-6 lg:px-8 border-b border-gray-200">
      <h2 className="text-base font-semibold leading-6 text-gray-900 mb-4">
        Calendar
      </h2>
      <div style={{ height: isMobile ? 550 : 650 }} className="overflow-x-auto">
        <EventCalendar
          key={isMobile ? "mobile" : "desktop"}
          events={events}
          views={isMobile ? ["day", "week", "agenda"] : ["month", "week", "day"]}
          defaultView={isMobile ? "day" : "month"}
          readOnly
          areEventsDraggable={false}
          areEventsResizable={false}
          eventCreation={false}
        />
      </div>
    </div>
  );
};

export default AdminBookingsCalendar;
