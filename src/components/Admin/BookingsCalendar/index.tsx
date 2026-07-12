import React from "react";
import { EventCalendar } from "@mui/x-scheduler/event-calendar";
import { useAdminBooking } from "@/context/AdminBookingContext";
import { DeliveryType } from "../../../../common/enums/DeliveryType";
import { mapBookingToEvent } from "./mapBookingToEvent";

interface IAdminBookingsCalendar {
  deliveryType: DeliveryType[];
}

const AdminBookingsCalendar = ({ deliveryType }: IAdminBookingsCalendar) => {
  const { bookings, thisWeekBookings, pastBookings } = useAdminBooking();

  const events = React.useMemo(() => {
    const all = [...pastBookings, ...thisWeekBookings, ...bookings];
    const filtered = deliveryType?.length
      ? all.filter((b) => deliveryType.includes(b.deliveryType as DeliveryType))
      : all;
    return filtered.map(mapBookingToEvent);
  }, [bookings, thisWeekBookings, pastBookings, deliveryType]);

  return (
    <div className="p-4 pb-8 sm:px-6 lg:px-8 border-b border-gray-200">
      <h2 className="text-base font-semibold leading-6 text-gray-900 mb-4">
        Calendar
      </h2>
      <div style={{ height: 650 }}>
        <EventCalendar
          events={events}
          views={["month", "week", "day"]}
          defaultView="month"
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
