import * as React from "react";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DateCalendar } from "@mui/x-date-pickers/DateCalendar";
import dayjs, { Dayjs } from "dayjs";
import { parseISO } from "date-fns";

const Calendar = () => {
  const [selectedDay, setSelectedDay] = React.useState<string>("");
  const selectDate = (event: Dayjs) => {
    console.log("this is the event", dayjs(event).toJSON());
    console.log("huhhh", dayjs("2024-08-28T14:00:00.000Z"));
    setSelectedDay(dayjs(event).toJSON());
  };

  const alldays = [
    "2024-08-27T14:00:00.000Z",
    "2024-08-28T14:00:00.000Z",
    "2024-08-15T14:00:00.000Z",
  ];
  const formatdays = alldays.map((day) => dayjs(day).subtract(1, "day"));
  const day = new Date("2024-08-28T14:00:00.000Z").getTime();
  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <DateCalendar
        onChange={(e) => selectDate(e)}
        shouldDisableDate={(date) => formatdays.some((day) => date.isSame(day))}
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
