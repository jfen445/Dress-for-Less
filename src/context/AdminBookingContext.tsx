"use client";

import * as React from "react";
import { Booking, UserType } from "../../common/types";
import { getAllBookings } from "@/api/admin";
import dayjs from "dayjs";

interface AdminBookingCtx {
  bookings: Booking[];
  thisWeekBookings: Booking[];
  pastBookings: Booking[];
  isLoading: boolean;
  getBookings: () => Promise<void>;
}

const adminBookingContext = React.createContext<AdminBookingCtx>(
  {} as AdminBookingCtx,
);

const AdminBookingContextProvider = ({ children }: React.PropsWithChildren) => {
  const [bookings, setBookings] = React.useState<Booking[]>([]);
  const [thisWeekBookings, setThisWeekBookings] = React.useState<Booking[]>([]);
  const [pastBookings, setPastBookings] = React.useState<Booking[]>([]);
  const [isLoading, setIsLoading] = React.useState<boolean>(false);

  const getBookings = async () => {
    setIsLoading(true);
    await getAllBookings().then((data) => {
      var d = new Date();
      d.setDate(d.getDate() + ((1 + 7 - d.getDay()) % 7 || 7));
      const now = new Date();

      const currentSunday = new Date(now);
      if (now.getDay() !== 0) {
        currentSunday.setDate(now.getDate() + (7 - now.getDay()));
      }
      currentSunday.setHours(23, 59, 59, 999);
      const sortedBookings = (data.data as unknown as Booking[]).sort(
        function (a, b) {
          return dayjs(a.dateBooked).diff(dayjs(b.dateBooked));
        },
      );

      const previousMonday = (d = dayjs()) => {
        // dayjs().day(): Sunday = 0, Monday = 1, ..., Saturday = 6
        const daysToSubtract = (d.day() + 6) % 7; // 0 when Monday, 1 when Tuesday, ..., 6 when Sunday
        return d.subtract(daysToSubtract, "day").startOf("day");
      };

      const thisWeek = sortedBookings.filter(
        (booking) =>
          dayjs(booking.dateBooked).isBefore(dayjs(currentSunday)) &&
          dayjs(booking.dateBooked).isAfter(dayjs(previousMonday())),
      );

      const allBookings = sortedBookings.filter((booking) =>
        dayjs(booking.dateBooked).isAfter(dayjs(currentSunday)),
      );

      const pastBookings = sortedBookings.filter((booking) =>
        dayjs(booking.dateBooked).isBefore(previousMonday()),
      );
      setPastBookings(pastBookings);

      setThisWeekBookings(thisWeek);
      setBookings(allBookings);
    });
    setIsLoading(false);
  };

  React.useEffect(() => {
    getBookings();
  }, []);

  return (
    <adminBookingContext.Provider
      value={{
        bookings,
        thisWeekBookings,
        pastBookings,
        isLoading,
        getBookings,
      }}
    >
      {children}
    </adminBookingContext.Provider>
  );
};

export function useAdminBooking() {
  return React.useContext(adminBookingContext);
}

export default AdminBookingContextProvider;
