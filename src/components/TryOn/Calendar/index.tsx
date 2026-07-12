"use client";

import * as React from "react";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DateCalendar } from "@mui/x-date-pickers/DateCalendar";
import dayjs, { Dayjs } from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { getAvailableTryOnDates } from "@/api/tryOnBooking";

dayjs.extend(utc);
dayjs.extend(timezone);

interface ITryOnCalendar {
  setSelectedDate: React.Dispatch<React.SetStateAction<string>>;
}

const TryOnCalendar = ({ setSelectedDate }: ITryOnCalendar) => {
  const [availableDates, setAvailableDates] = React.useState<string[]>([]);

  React.useEffect(() => {
    getAvailableTryOnDates()
      .then((res) => setAvailableDates(res.data.dates ?? []))
      .catch(() => setAvailableDates([]));
  }, []);

  const selectDate = (event: Dayjs | null) => {
    if (!event) return;
    setSelectedDate(event.format("YYYY-MM-DD"));
  };

  const disabledDays = (date: dayjs.Dayjs) => {
    const today = dayjs().startOf("day");

    if (date.isBefore(today, "day")) {
      return true;
    }

    const twoMonthsFromNow = today.add(2, "month");
    if (date.isAfter(twoMonthsFromNow, "day")) {
      return true;
    }

    if (!availableDates.includes(date.format("YYYY-MM-DD"))) {
      return true;
    }

    return false;
  };

  return (
    <div className="mt-10">
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <DateCalendar
          onChange={(e) => selectDate(e)}
          shouldDisableDate={disabledDays}
          timezone="Pacific/Auckland"
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

export default TryOnCalendar;
