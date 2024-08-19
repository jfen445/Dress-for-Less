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
    setSelectedDate(dayjs(event).toJSON());
  };

  function disableWeekdays(date: any) {
    console.log(dayjs(Date.now()).diff(date));
    return (
      !(date.day() === 0 || date.day() === 6) ||
      dayjs(Date.now()).diff(date) > 0
    );
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
