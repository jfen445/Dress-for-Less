import * as React from "react";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DateCalendar } from "@mui/x-date-pickers/DateCalendar";
import dayjs, { Dayjs } from "dayjs";
import { BlockOut, Booking, Sizes } from "../../../../common/types";
import { getAllBookingsByDress, getBlockOutsByDress } from "@/api/booking";
import { useParams } from "next/navigation";

interface ICanlender {
  setSelectedDate: React.Dispatch<React.SetStateAction<string>>;
  sizes: Sizes;
  selectedSize: string;
  dressId?: string;
}

const Calendar = ({ setSelectedDate, sizes, selectedSize, dressId: dressIdProp }: ICanlender) => {
  const params = useParams<{ id: string }>();
  const resolvedId = dressIdProp ?? params?.id ?? "";
  const [bookings, setBookings] = React.useState<Booking[]>();
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

  const selectDate = (event: Dayjs) => {
    setSelectedDate(dayjs(event).toJSON());
  };

  function disabledDays(date: dayjs.Dayjs) {
    if (!selectedSize) {
      return true;
    }

    const isBlockedOut = blockOuts.some(
      (b) =>
        b.size === selectedSize &&
        !date.isBefore(dayjs(b.startDate), "day") &&
        !date.isAfter(dayjs(b.endDate), "day"),
    );
    if (isBlockedOut) return true;

    const sizeStock = readObject(sizes, selectedSize.toLowerCase());

    // Disable if this date falls within any booking's block-out period (covers the full Fri-Sun window).
    const blockedCount =
      bookings?.filter(
        (booking) =>
          booking.size == selectedSize &&
          booking.blockOutPeriod?.some((bp) => dayjs(bp).isSame(date, "day")),
      ).length ?? 0;

    if (blockedCount >= sizeStock) {
      return true;
    }

    // Fall back to checking dateBooked directly for bookings without a blockOutPeriod.
    const days = bookings?.filter(
      (booking) =>
        !booking.blockOutPeriod?.length &&
        dayjs(booking.dateBooked).isSame(date, "day") &&
        booking.size == selectedSize,
    );

    if (days && days.length >= sizeStock) {
      return true;
    }

    const today = dayjs();
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
      dayjs(Date.now()).diff(date) > 0
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

  const readObject = (obj: { [x: string]: any }, prop: string | number) => {
    return obj[prop];
  };

  return (
    <div className="mt-10 ">
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <DateCalendar
          key={`${selectedSize}-${blockOuts.map((b) => b._id).join(",")}`}
          onChange={(e) => selectDate(e)}
          shouldDisableDate={(date) => disabledDays(date)}
          timezone="system"
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
