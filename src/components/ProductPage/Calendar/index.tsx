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
          .catch((err) => console.error(err));
      }
    };

    getDressBookings();
  }, [params, selectedSize]);

  const selectDate = (event: Dayjs) => {
    setSelectedDate(dayjs(event).toJSON());
  };

  function disableWeekdays(date: any) {
    if (!selectedSize) {
      return true;
    }

    const days = bookings?.filter(
      (booking) =>
        dayjs(booking.dateBooked).isSame(date) && booking.size == selectedSize
    );

    if (days && days.length >= readObject(sizes, selectedSize.toLowerCase())) {
      return true;
    }

    return (
      !(date.day() === 0 || date.day() === 6) ||
      dayjs(Date.now()).diff(date) > 0
    );
  }

  const readObject = (obj: { [x: string]: any }, prop: string | number) => {
    return obj[prop];
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <DateCalendar
        onChange={(e) => selectDate(e)}
        shouldDisableDate={(date) => disableWeekdays(date)}
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
  );
};

export default Calendar;
