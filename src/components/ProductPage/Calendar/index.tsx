import * as React from "react";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DateCalendar } from "@mui/x-date-pickers/DateCalendar";
import dayjs, { Dayjs } from "dayjs";
import { AUCKLAND_TZ, auckland } from "../../../../lib/utils/timezone";
import {
  isDeliveryAllowedForDate,
  isPickupAllowedForDate,
} from "../../../../lib/utils/deliveryRules";
import { isDateBlockedByExistingBooking } from "../../../../lib/utils/bookingWindow";
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
}

const Calendar = ({
  setSelectedDate,
  sizes,
  selectedSize,
  dressId: dressIdProp,
  isAdmin = false,
  excludeBookingId,
  deliveryType,
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
    const isAllowedForDate =
      method === DeliveryType.Pickup
        ? isPickupAllowedForDate(dateStr)
        : isDeliveryAllowedForDate(dateStr);
    if (!isAllowedForDate) {
      return true;
    }

    // Conflicts with an existing booking of the same dress+size, counted
    // against that size's stock.
    const sizeStock = readObject(sizes, selectedSize.toLowerCase());

    const relevantBookings = excludeBookingId
      ? bookings?.filter((b) => b._id !== excludeBookingId)
      : bookings;

    const blockedCount =
      relevantBookings?.filter(
        (booking) =>
          booking.size == selectedSize &&
          isDateBlockedByExistingBooking(dateStr, method, booking),
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

    const method = deliveryType ?? DeliveryType.Delivery;

    const blockedCount =
      relevantBookings?.filter(
        (booking) =>
          booking.size == selectedSize &&
          isDateBlockedByExistingBooking(dateStr, method, booking),
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
          key={`${selectedSize}-${deliveryType}-${blockOuts.map((b) => b._id).join(",")}`}
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
