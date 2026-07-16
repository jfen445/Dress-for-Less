import * as React from "react";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DateCalendar } from "@mui/x-date-pickers/DateCalendar";
import dayjs, { Dayjs } from "dayjs";
import { AUCKLAND_TZ, auckland } from "../../../../lib/utils/timezone";
import { BlockOut, BookingAvailability, Sizes } from "../../../../common/types";
import { getAllBookingsByDress, getBlockOutsByDress } from "@/api/booking";
import { useParams } from "next/navigation";

// Converts any stored date string (plain YYYY-MM-DD or UTC ISO) to NZ date string
const toNZDate = (s: string) =>
  s.length === 10 ? s : dayjs(s).tz(AUCKLAND_TZ).format("YYYY-MM-DD");

interface ICanlender {
  setSelectedDate: React.Dispatch<React.SetStateAction<string>>;
  sizes: Sizes;
  selectedSize: string;
  dressId?: string;
  isAdmin?: boolean;
  excludeBookingId?: string;
}

const Calendar = ({
  setSelectedDate,
  sizes,
  selectedSize,
  dressId: dressIdProp,
  isAdmin = false,
  excludeBookingId,
}: ICanlender) => {
  const params = useParams<{ id: string }>();
  const resolvedId = dressIdProp ?? params?.id ?? "";
  const [bookings, setBookings] = React.useState<BookingAvailability[]>();
  const [blockOuts, setBlockOuts] = React.useState<BlockOut[]>([]);

  React.useEffect(() => {
    if (!resolvedId) return;

    const getDressBookings = async () => {
      await getAllBookingsByDress(resolvedId)
        .then((data) => setBookings(data.data))
        .catch(() => {});
    };

    const getDressBlockOuts = async () => {
      await getBlockOutsByDress(resolvedId)
        .then((data) => setBlockOuts(data.data))
        .catch((err) => console.error("Failed to load block outs:", err));
    };

    getDressBookings();
    getDressBlockOuts();
  }, [resolvedId, selectedSize]);

  const selectDate = (event: Dayjs | null) => {
    if (!event) return;
    setSelectedDate(event.format("YYYY-MM-DD"));
  };

  function disabledDays(date: dayjs.Dayjs) {
    if (!selectedSize) {
      return true;
    }

    const dateStr = date.format("YYYY-MM-DD");

    const isBlockedOut = blockOuts.some(
      (b) =>
        b.size === selectedSize &&
        dateStr >= b.startDate.slice(0, 10) &&
        dateStr <= b.endDate.slice(0, 10),
    );
    if (isBlockedOut) return true;

    const sizeStock = readObject(sizes, selectedSize.toLowerCase());

    const relevantBookings = excludeBookingId
      ? bookings?.filter((b) => b._id !== excludeBookingId)
      : bookings;

    // Disable if this date falls within any booking's block-out period (covers the full Fri-Sun window).
    const blockedCount =
      relevantBookings?.filter(
        (booking) =>
          booking.size == selectedSize &&
          booking.blockOutPeriod?.some((bp) => toNZDate(bp) === dateStr),
      ).length ?? 0;

    if (blockedCount >= sizeStock) {
      return true;
    }

    // Fall back to checking dateBooked directly for bookings without a blockOutPeriod.
    const days = relevantBookings?.filter(
      (booking) =>
        !booking.blockOutPeriod?.length &&
        toNZDate(booking.dateBooked) === dateStr &&
        booking.size == selectedSize,
    );

    if (days && days.length >= sizeStock) {
      return true;
    }

    const today = auckland.now();
    const startOfWeek = today.startOf("week").add(1, "day"); // Move to Monday
    const endOfWeek = today.startOf("week").add(7, "day"); // Move to Sunday (inclusive)

    const isThisWeek =
      !date.isBefore(startOfWeek, "day") && !date.isAfter(endOfWeek, "day");

    const isAfterWednesday = today.day() > 3;
    const isWeekend = date.day() === 5 || date.day() === 6 || date.day() === 0;

    // Disable Friday - Sunday only for this week if today is after Wednesday
    if (isThisWeek && isAfterWednesday && isWeekend) {
      return true;
    }

    // Disable days Monday - Thursday
    if (
      !(date.day() === 0 || date.day() === 5 || date.day() === 6) ||
      auckland.now().diff(date) > 0
    ) {
      return true;
    }

    // Disable if date is more than 6 months in the future
    const sixMonthsFromNow = today.add(6, "month");
    if (date.isAfter(sixMonthsFromNow, "day")) {
      return true;
    }

    return false;
  }

  const disableForAdmin = (date: dayjs.Dayjs) => {
    if (!selectedSize) {
      return true;
    }

    const dateStr = date.format("YYYY-MM-DD");

    const isBlockedOut = blockOuts.some(
      (b) =>
        b.size === selectedSize &&
        dateStr >= b.startDate.slice(0, 10) &&
        dateStr <= b.endDate.slice(0, 10),
    );
    if (isBlockedOut) return true;

    const sizeStock = readObject(sizes, selectedSize.toLowerCase());

    const relevantBookings = excludeBookingId
      ? bookings?.filter((b) => b._id !== excludeBookingId)
      : bookings;

    // Disable if this date falls within any booking's block-out period (covers the full Fri-Sun window).
    const blockedCount =
      relevantBookings?.filter(
        (booking) =>
          booking.size == selectedSize &&
          booking.blockOutPeriod?.some((bp) => toNZDate(bp) === dateStr),
      ).length ?? 0;

    if (blockedCount >= sizeStock) {
      return true;
    }

    // Fall back to checking dateBooked directly for bookings without a blockOutPeriod.
    const days = relevantBookings?.filter(
      (booking) =>
        !booking.blockOutPeriod?.length &&
        toNZDate(booking.dateBooked) === dateStr &&
        booking.size == selectedSize,
    );

    if (days && days.length >= sizeStock) {
      return true;
    }

    const today = auckland.now();
    const startOfWeek = today.startOf("week").add(1, "day"); // Move to Monday
    const endOfWeek = today.startOf("week").add(7, "day"); // Move to Sunday (inclusive)

    const isThisWeek =
      !date.isBefore(startOfWeek, "day") && !date.isAfter(endOfWeek, "day");

    const isAfterWednesday = today.day() > 3;
    const isWeekend = date.day() === 5 || date.day() === 6 || date.day() === 0;

    // Disable Friday - Sunday only for this week if today is after Wednesday
    if (isThisWeek && isAfterWednesday && isWeekend) {
      return true;
    }

    // Disable if date is more than 6 months in the future
    const sixMonthsFromNow = today.add(6, "month");
    if (date.isAfter(sixMonthsFromNow, "day")) {
      return true;
    }

    return false;
  };

  const getDisabledDates = (date: dayjs.Dayjs) => {
    if (isAdmin) {
      return disableForAdmin(date);
    } else {
      return disabledDays(date);
    }
  };

  const readObject = (obj: { [x: string]: any }, prop: string | number) => {
    return obj[prop];
  };

  return (
    <div className="mt-10 ">
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <DateCalendar
          key={`${selectedSize}-${blockOuts.map((b) => b._id).join(",")}`}
          onChange={(e) => selectDate(e)}
          shouldDisableDate={(date) => getDisabledDates(date)}
          timezone={AUCKLAND_TZ}
          slotProps={{
            day: {
              sx: {
                "&.Mui-selected": { "background-color": "#fda4af" },
              },
            },
          }}
        />
      </LocalizationProvider>
    </div>
  );
};

export default Calendar;
