import * as React from "react";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DateCalendar } from "@mui/x-date-pickers/DateCalendar";
import dayjs, { Dayjs } from "dayjs";
import { parseISO } from "date-fns";

interface ICanlender {
  setSelectedDate: React.Dispatch<React.SetStateAction<string>>;
}

const Calendar = ({ setSelectedDate }: ICanlender) => {
  const selectDate = (event: Dayjs) => {
    console.log("this is the event", dayjs(event).toJSON());
    console.log("huhhh", dayjs("2024-08-28T14:00:00.000Z"));
    setSelectedDate(dayjs(event).toJSON());
  };

  const alldays = [
    "2024-08-27T14:00:00.000Z",
    "2024-08-28T14:00:00.000Z",
    "2024-08-15T14:00:00.000Z",
  ];
  const formatdays = alldays.map((day) => dayjs(day).subtract(1, "day"));
  const day = new Date("2024-08-28T14:00:00.000Z").getTime();

  function disableWeekdays(date: any) {
    return !(date.day() === 0 || date.day() === 6);
  }

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
