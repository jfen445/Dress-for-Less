import * as React from "react";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DateCalendar } from "@mui/x-date-pickers/DateCalendar";
import dayjs, { Dayjs } from "dayjs";
import { AUCKLAND_TZ, auckland } from "../../../../lib/utils/timezone";
import { isBookingAllowedForDate } from "../../../../lib/utils/deliveryRules";
import {
  MAX_RENTAL_DAYS,
  calculateReturnDate,
  isDateBlockedForEvent,
  isDateBlockedForRange,
  isReturnDayAllowed,
  rentalSpanDays,
} from "../../../../lib/utils/bookingWindow";
import { DeliveryType } from "../../../../common/enums/DeliveryType";
import { BlockOut, BookingAvailability, Sizes } from "../../../../common/types";
import { getAllBookingsByDress, getBlockOutsByDress } from "@/api/booking";
import { useParams } from "next/navigation";

interface ICanlender {
  setSelectedDate: React.Dispatch<React.SetStateAction<string>>;
  sizes: Sizes;
  selectedSize: string;
  dressId?: string;
  isAdmin?: boolean;
  excludeBookingId?: string;
  deliveryType?: DeliveryType;
  // When set, picks the RETURN DATE of a booking whose event date is this,
  // asking availability about the whole span through the predicate the reserve
  // uses. Admin-only — there is no customer price for an extended rental.
  rangeStart?: string;
}

const Calendar = ({
  setSelectedDate,
  sizes,
  selectedSize,
  dressId: dressIdProp,
  isAdmin = false,
  excludeBookingId,
  deliveryType,
  rangeStart,
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

    // No past dates.
    if (auckland.now().diff(date) > 0) {
      return true;
    }

    const today = auckland.now();
    const sixMonthsFromNow = today.add(6, "month");
    if (date.isAfter(sixMonthsFromNow, "day")) {
      return true;
    }

    const method = deliveryType ?? DeliveryType.Delivery;

    // Notice-from-today: has to clear the 8pm-day-before-dispatch cutoff for
    // whichever method the shopper has selected.
    if (!isBookingAllowedForDate(dateStr, method)) {
      return true;
    }

    // Conflicts with an existing booking of the same dress+size, counted
    // against that size's stock.
    const sizeStock = readObject(sizes, selectedSize.toLowerCase());

    const relevantBookings = excludeBookingId
      ? bookings?.filter((b) => b.bookingId !== excludeBookingId)
      : bookings;

    const blockedCount =
      relevantBookings?.filter(
        (booking) =>
          booking.size == selectedSize &&
          isDateBlockedForEvent(dateStr, method, booking),
      ).length ?? 0;

    if (blockedCount >= sizeStock) {
      return true;
    }

    return false;
  }

  const disableForAdmin = (date: dayjs.Dayjs) => {
    if (!selectedSize) {
      return true;
    }

    const dateStr = date.format("YYYY-MM-DD");
    const method = deliveryType ?? DeliveryType.Delivery;

    // In range mode the calendar is picking a return date for the booking that
    // starts on rangeStart; outside it, the event date itself. The span runs
    // from the event date to the return date, and collapses to the single day
    // when there is no range.
    const eventDate = rangeStart ?? dateStr;

    if (rangeStart) {
      // The derived return date is the floor: a dress cannot come back before
      // the day it is due, and picking the event date itself — which the old
      // rangeStart comparison allowed — is never a real choice.
      if (dateStr < calculateReturnDate(rangeStart, method)) return true;
      if (rentalSpanDays(rangeStart, dateStr) > MAX_RENTAL_DAYS) return true;
      // Weekend only matters for a return; Saturday events are the common case,
      // so this is scoped to range mode rather than applied to every pick.
      if (!isReturnDayAllowed(dateStr, method)) return true;
    }

    // Overlap between the span and the block-out, which collapses to the
    // original "is this day inside it" test when the span is one day.
    const isBlockedOut = blockOuts.some(
      (b) =>
        b.size === selectedSize &&
        eventDate <= b.endDate.slice(0, 10) &&
        dateStr >= b.startDate.slice(0, 10),
    );
    if (isBlockedOut) return true;

    const sizeStock = readObject(sizes, selectedSize.toLowerCase());

    const relevantBookings = excludeBookingId
      ? bookings?.filter((b) => b.bookingId !== excludeBookingId)
      : bookings;

    const blockedCount =
      relevantBookings?.filter(
        (booking) =>
          booking.size == selectedSize &&
          (rangeStart
            ? isDateBlockedForRange(rangeStart, dateStr, method, booking)
            : isDateBlockedForEvent(dateStr, method, booking)),
      ).length ?? 0;

    if (blockedCount >= sizeStock) {
      return true;
    }

    // Disable if date is more than 6 months in the future
    const today = auckland.now();
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
          // rangeStart is in the key so choosing a different start date
          // remounts the end picker, clearing a selection that may no longer
          // be reachable from the new start.
          key={`${selectedSize}-${deliveryType}-${rangeStart ?? ""}-${blockOuts.map((b) => b._id).join(",")}`}
          onChange={(e) => selectDate(e)}
          shouldDisableDate={(date) => getDisabledDates(date)}
          // Admins can back-date a booking (recording one taken over the phone,
          // or fixing a past entry); customers can't book yesterday.
          minDate={
            rangeStart
              ? auckland.toZone(rangeStart)
              : isAdmin
                ? auckland.now().subtract(1, "year").startOf("day")
                : auckland.now().startOf("day")
          }
          maxDate={auckland.now().add(1, "year")}
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
