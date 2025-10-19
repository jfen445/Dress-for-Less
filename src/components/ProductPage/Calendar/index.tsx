import * as React from "react";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DateCalendar } from "@mui/x-date-pickers/DateCalendar";
import dayjs, { Dayjs } from "dayjs";
import { Booking, Sizes } from "../../../../common/types";
import { getAllBookingsByDress } from "@/api/booking";
import { useParams } from "next/navigation";

interface ICanlender {
  setSelectedDate: React.Dispatch<React.SetStateAction<string>>;
  sizes: Sizes;
  selectedSize: string;
}

const Calendar = ({ setSelectedDate, sizes, selectedSize }: ICanlender) => {
  const params = useParams<{ id: string }>();
  const [bookings, setBookings] = React.useState<Booking[]>();

  React.useEffect(() => {
    const getDressBookings = async () => {
      if (params) {
        await getAllBookingsByDress(params.id)
          .then((data) => {
            setBookings(data.data);
          })
          .catch(() => {});
      }
    };

    getDressBookings();
  }, [params, selectedSize]);

  const selectDate = (event: Dayjs) => {
    setSelectedDate(dayjs(event).toJSON());
  };

  function disabledDays(date: dayjs.Dayjs) {
    if (!selectedSize) {
      return true;
    }

    //disabled booked days
    const days = bookings?.filter(
      (booking) =>
        dayjs(booking.dateBooked).isSame(date) && booking.size == selectedSize
    );

    if (days && days.length >= readObject(sizes, selectedSize.toLowerCase())) {
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
