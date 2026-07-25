"use client";

import * as React from "react";
import { Booking, UserType } from "../../common/types";
import { getAllBookings, getDressBookingStatuses } from "@/api/admin";
import { BookingStatus } from "../../common/enums/BookingStatus";
import { auckland } from "../../lib/utils/timezone";

export type ActiveDressBooking = {
  dressId: string;
  size: string;
  status: BookingStatus;
};

interface AdminBookingCtx {
  bookings: Booking[];
  thisWeekBookings: Booking[];
  pastBookings: Booking[];
  isLoading: boolean;
  getBookings: () => Promise<void>;
  updateBookingStatus: (bookingId: string, status: BookingStatus) => void;
  removeBooking: (bookingId: string) => void;
  dressStatuses: Record<string, ActiveDressBooking[]>;
  fetchDressStatuses: () => Promise<void>;
}

const adminBookingContext = React.createContext<AdminBookingCtx>(
  {} as AdminBookingCtx,
);

const AdminBookingContextProvider = ({ children }: React.PropsWithChildren) => {
  const [bookings, setBookings] = React.useState<Booking[]>([]);
  const [thisWeekBookings, setThisWeekBookings] = React.useState<Booking[]>([]);
  const [pastBookings, setPastBookings] = React.useState<Booking[]>([]);
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [dressStatuses, setDressStatuses] = React.useState<
    Record<string, ActiveDressBooking[]>
  >({});
  // Guards against re-fetching every time AdminDresses remounts (it's
  // conditionally rendered per admin tab); a ref (not state) so the check is
  // synchronous and can't race a second call while the first is in flight.
  const dressStatusesRequested = React.useRef(false);

  const fetchDressStatuses = React.useCallback(async () => {
    if (dressStatusesRequested.current) return;
    dressStatusesRequested.current = true;
    try {
      const res = await getDressBookingStatuses();
      const active = res.data as ActiveDressBooking[];
      const grouped: Record<string, ActiveDressBooking[]> = {};
      active.forEach((item) => {
        grouped[item.dressId] = grouped[item.dressId] ?? [];
        grouped[item.dressId].push(item);
      });
      setDressStatuses(grouped);
    } catch {
      dressStatusesRequested.current = false; // allow a retry on failure
    }
  }, []);

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

  // The dress-status cache is keyed by dressId/size, not bookingId, so a
  // status/delete change to a booking has to be patched into it separately —
  // otherwise the Dresses tab keeps showing whatever was cached at the last
  // fetch until a full page reload.
  const findBookingItems = (bookingId: string) =>
    [...bookings, ...thisWeekBookings, ...pastBookings].find(
      (b) => b._id === bookingId,
    )?.items ?? [];

  const updateBookingStatus = (bookingId: string, status: BookingStatus) => {
    const patch = (list: Booking[]) =>
      list.map((b) => (b._id === bookingId ? { ...b, status } : b));
    setBookings(patch);
    setThisWeekBookings(patch);
    setPastBookings(patch);

    const items = findBookingItems(bookingId);
    if (items.length === 0) return;
    setDressStatuses((prev) => {
      const next = { ...prev };
      items.forEach((item) => {
        const entries = next[item.dressId];
        if (!entries) return;
        next[item.dressId] = entries.map((entry) =>
          entry.size === item.size ? { ...entry, status } : entry,
        );
      });
      return next;
    });
  };

  const removeBooking = (bookingId: string) => {
    const items = findBookingItems(bookingId);

    const remove = (list: Booking[]) => list.filter((b) => b._id !== bookingId);
    setBookings(remove);
    setThisWeekBookings(remove);
    setPastBookings(remove);

    if (items.length === 0) return;
    setDressStatuses((prev) => {
      const next = { ...prev };
      items.forEach((item) => {
        const entries = next[item.dressId];
        if (!entries) return;
        next[item.dressId] = entries.filter(
          (entry) => entry.size !== item.size,
        );
      });
      return next;
    });
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
        dressStatuses,
        fetchDressStatuses,
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
