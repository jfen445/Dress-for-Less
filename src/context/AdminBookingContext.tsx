"use client";

import * as React from "react";
import { Booking, UserType } from "../../common/types";
import { getAllBookings } from "@/api/admin";
import { BookingStatus } from "../../common/enums/BookingStatus";
import { auckland } from "../../lib/utils/timezone";

interface AdminBookingCtx {
  bookings: Booking[];
  thisWeekBookings: Booking[];
  pastBookings: Booking[];
  isLoading: boolean;
  getBookings: () => Promise<void>;
  updateBookingStatus: (bookingId: string, status: BookingStatus) => void;
  removeBooking: (bookingId: string) => void;
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
      const now = auckland.now();
      const currentSunday = (
        now.day() === 0 ? now : now.add(7 - now.day(), "day")
      ).endOf("day");
      // now.day(): Sunday = 0, Monday = 1, ..., Saturday = 6
      const previousMonday = now.subtract((now.day() + 6) % 7, "day").startOf("day");

      const primaryDate = (booking: Booking) => booking.items[0]?.dateBooked;
      const dateOf = (booking: Booking) => auckland.toZone(primaryDate(booking));

      const sortedBookings = (data.data as unknown as Booking[]).sort(
        (a, b) => dateOf(a).diff(dateOf(b)),
      );

      const thisWeek = sortedBookings.filter((booking) => {
        const date = dateOf(booking);
        return date.isBefore(currentSunday) && date.isAfter(previousMonday);
      });

      const allBookings = sortedBookings.filter((booking) =>
        dateOf(booking).isAfter(currentSunday),
      );

      const pastBookings = sortedBookings
        .filter((booking) => dateOf(booking).isBefore(previousMonday))
        .sort((a, b) => dateOf(b).diff(dateOf(a)));
      setPastBookings(pastBookings);

      setThisWeekBookings(thisWeek);
      setBookings(allBookings);
    });
    setIsLoading(false);
  };

  const updateBookingStatus = (bookingId: string, status: BookingStatus) => {
    const patch = (list: Booking[]) =>
      list.map((b) => (b._id === bookingId ? { ...b, status } : b));
    setBookings(patch);
    setThisWeekBookings(patch);
    setPastBookings(patch);
  };

  const removeBooking = (bookingId: string) => {
    const remove = (list: Booking[]) => list.filter((b) => b._id !== bookingId);
    setBookings(remove);
    setThisWeekBookings(remove);
    setPastBookings(remove);
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
        updateBookingStatus,
        removeBooking,
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
