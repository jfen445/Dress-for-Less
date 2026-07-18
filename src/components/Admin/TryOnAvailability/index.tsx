import React from "react";
import dayjs, { Dayjs } from "dayjs";
import { AUCKLAND_TZ } from "../../../../lib/utils/timezone";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DateCalendar } from "@mui/x-date-pickers/DateCalendar";
import { PickerDay, PickerDayProps } from "@mui/x-date-pickers/PickerDay";
import {
  getTryOnAvailability,
  upsertTryOnAvailability,
  deleteTryOnAvailability,
  getAllTryOnBookings,
} from "@/api/admin";
import { TryOnAvailability } from "../../../../common/types";
import { TryOnStatus } from "../../../../common/enums/TryOnStatus";
import Button from "@/components/Button";
import Spinner from "@/components/Spinner";
import Toast, { ToastType, ToastVariant } from "@/components/Toast";
import {
  TRY_ON_TIME_SLOTS,
  formatTryOnTimeSlot,
} from "../../../../common/constants/tryOn";

type TryOnBookingRow = {
  _id: string;
  name: string;
  email: string;
  date: string;
  timeSlot: string;
  status: TryOnStatus;
};

interface IDayWithIndicators extends PickerDayProps {
  availableDates?: Set<string>;
  bookedDates?: Set<string>;
}

const DayWithIndicators = (props: IDayWithIndicators) => {
  const { availableDates, bookedDates, day, ...other } = props;
  const dateStr = dayjs(day).format("YYYY-MM-DD");
  const hasAvailability = availableDates?.has(dateStr) ?? false;
  const hasBookings = bookedDates?.has(dateStr) ?? false;

  return (
    <span style={{ position: "relative", display: "inline-block" }}>
      <PickerDay {...other} day={day} />
      {(hasAvailability || hasBookings) && (
        <span
          style={{
            position: "absolute",
            bottom: 3,
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            gap: 2,
            pointerEvents: "none",
          }}
        >
          {hasAvailability && (
            <span
              style={{
                width: 4,
                height: 4,
                borderRadius: "50%",
                backgroundColor: "#22c55e",
              }}
            />
          )}
          {hasBookings && (
            <span
              style={{
                width: 4,
                height: 4,
                borderRadius: "50%",
                backgroundColor: "#3b82f6",
              }}
            />
          )}
        </span>
      )}
    </span>
  );
};

const getStatusColour = (status: TryOnStatus) => {
  switch (status) {
    case TryOnStatus.Completed:
      return "bg-green-50 text-green-700 ring-green-600/20";
    case TryOnStatus.Cancelled:
      return "bg-red-50 text-red-700 ring-red-600/20";
    case TryOnStatus.NoShow:
      return "bg-orange-50 text-orange-700 ring-orange-600/20";
    case TryOnStatus.Booked:
    default:
      return "bg-blue-50 text-blue-700 ring-blue-600/20";
  }
};

const AdminTryOnAvailability = () => {
  const [availability, setAvailability] = React.useState<TryOnAvailability[]>(
    [],
  );
  const [bookings, setBookings] = React.useState<TryOnBookingRow[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [toast, setToast] = React.useState<ToastType>({
    message: "",
    variant: ToastVariant.WARNING,
    show: false,
  });

  const [selectedDate, setSelectedDate] = React.useState<string | null>(null);
  const [timeSlots, setTimeSlots] = React.useState<string[]>([]);
  const [pendingTime, setPendingTime] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const fetchAll = () => {
    setIsLoading(true);
    Promise.all([getTryOnAvailability(), getAllTryOnBookings()])
      .then(([availabilityRes, bookingsRes]) => {
        setAvailability(availabilityRes.data as TryOnAvailability[]);
        setBookings(bookingsRes.data as TryOnBookingRow[]);
      })
      .catch(() =>
        setToast({
          message: "Failed to load try-on availability",
          variant: ToastVariant.WARNING,
          show: true,
        }),
      )
      .finally(() => setIsLoading(false));
  };

  React.useEffect(() => {
    fetchAll();
  }, []);

  const availabilityByDate = React.useMemo(() => {
    const map = new Map<string, TryOnAvailability>();
    availability.forEach((a) => map.set(a.date, a));
    return map;
  }, [availability]);

  const bookingsByDate = React.useMemo(() => {
    const map = new Map<string, TryOnBookingRow[]>();
    bookings.forEach((b) => {
      const existing = map.get(b.date) ?? [];
      existing.push(b);
      map.set(b.date, existing);
    });
    return map;
  }, [bookings]);

  const availableDatesSet = React.useMemo(
    () =>
      new Set(
        availability.filter((a) => a.timeSlots.length > 0).map((a) => a.date),
      ),
    [availability],
  );

  const bookedDatesSet = React.useMemo(
    () => new Set(bookings.map((b) => b.date)),
    [bookings],
  );

  const selectDate = (date: Dayjs | null) => {
    if (!date) return;
    const dateStr = date.format("YYYY-MM-DD");
    setSelectedDate(dateStr);
    setTimeSlots(availabilityByDate.get(dateStr)?.timeSlots ?? []);
    setPendingTime("");
  };

  const addTime = (time: string) => {
    if (!time || timeSlots.includes(time)) return;
    setTimeSlots((prev) => [...prev, time].sort());
  };

  const removeTime = (time: string) => {
    setTimeSlots((prev) => prev.filter((t) => t !== time));
  };

  const handleAddPendingTime = () => {
    addTime(pendingTime);
    setPendingTime("");
  };

  const handleSave = () => {
    if (!selectedDate || timeSlots.length === 0) {
      setToast({
        message: "Add at least one time slot before saving",
        variant: ToastVariant.WARNING,
        show: true,
      });
      return;
    }
    setIsSubmitting(true);
    upsertTryOnAvailability({ date: selectedDate, timeSlots })
      .then(() => fetchAll())
      .catch(() =>
        setToast({
          message: "Failed to save try-on availability",
          variant: ToastVariant.WARNING,
          show: true,
        }),
      )
      .finally(() => setIsSubmitting(false));
  };

  const handleRemove = () => {
    if (!selectedDate) return;
    deleteTryOnAvailability(selectedDate)
      .then(() => {
        setTimeSlots([]);
        fetchAll();
      })
      .catch(() =>
        setToast({
          message: "Failed to remove try-on availability",
          variant: ToastVariant.WARNING,
          show: true,
        }),
      );
  };

  const inputCls =
    "block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 sm:text-sm sm:leading-6";
  const labelCls = "block text-sm font-medium text-gray-700 mb-1";

  const selectedDateBookings = selectedDate
    ? (bookingsByDate.get(selectedDate) ?? [])
    : [];
  const hasExistingAvailability =
    !!selectedDate && availabilityByDate.has(selectedDate);

  return (
    <>
      <Toast toast={toast} setToast={setToast} />
      <div className="p-4 pb-8 sm:px-6 lg:px-8 border-b border-gray-200">
        <div className="sm:flex sm:items-center pb-4">
          <div className="sm:flex-auto">
            <h1 className="text-base font-semibold leading-6 text-gray-900">
              Try-On Availability
            </h1>
            <p className="mt-2 text-sm text-gray-700">
              Click a date to choose which times customers can book a try-on
              session. Each time is a 30-minute slot.
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center">
            <Spinner />
          </div>
        ) : (
          <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
            <div>
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DateCalendar
                  onChange={(d) => selectDate(d)}
                  timezone={AUCKLAND_TZ}
                  slots={{ day: DayWithIndicators }}
                  slotProps={
                    {
                      day: {
                        availableDates: availableDatesSet,
                        bookedDates: bookedDatesSet,
                      },
                    } as any
                  }
                />
              </LocalizationProvider>
              <div className="mt-2 flex gap-4 text-xs text-gray-600">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-green-500" />
                  Try-ons open
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-blue-500" />
                  Has bookings
                </span>
              </div>
            </div>

            <div className="flex-1 min-w-0 max-w-xl">
              {!selectedDate ? (
                <p className="text-sm text-gray-500">
                  Select a date on the calendar to configure try-on
                  availability.
                </p>
              ) : (
                <div>
                  <h2 className="text-sm font-semibold text-gray-900">
                    {dayjs(selectedDate).format("dddd, MMMM D, YYYY")}
                  </h2>

                  {selectedDateBookings.length > 0 && (
                    <div className="mt-4">
                      <h3 className="text-xs font-medium uppercase tracking-wide text-gray-500">
                        Bookings
                      </h3>
                      <ul className="mt-2 space-y-2">
                        {selectedDateBookings
                          .slice()
                          .sort((a, b) => a.timeSlot.localeCompare(b.timeSlot))
                          .map((b) => (
                            <li
                              key={b._id}
                              className="flex items-center justify-between rounded-md border border-gray-200 px-3 py-2 text-sm"
                            >
                              <span>
                                <span className="font-medium text-gray-900">
                                  {formatTryOnTimeSlot(b.timeSlot)}
                                </span>{" "}
                                <span className="text-gray-500">
                                  {b.name}
                                </span>
                              </span>
                              <span
                                className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${getStatusColour(
                                  b.status,
                                )}`}
                              >
                                {b.status}
                              </span>
                            </li>
                          ))}
                      </ul>
                    </div>
                  )}

                  <div className="mt-4">
                    <label className={labelCls}>Add a time</label>
                    <div className="flex gap-2">
                      <input
                        type="time"
                        value={pendingTime}
                        onChange={(e) => setPendingTime(e.target.value)}
                        className={inputCls}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={handleAddPendingTime}
                        className="whitespace-nowrap rounded-md px-3 py-1.5 text-sm text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                      >
                        Add
                      </Button>
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className={labelCls}>Quick add</label>
                    <div className="flex flex-wrap gap-2">
                      {TRY_ON_TIME_SLOTS.map((slot) => (
                        <Button
                          key={slot}
                          type="button"
                          variant="ghost"
                          onClick={() => addTime(slot)}
                          disabled={timeSlots.includes(slot)}
                          className="rounded-full px-3 py-1 text-xs font-medium text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed"
                        >
                          {formatTryOnTimeSlot(slot)}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className={labelCls}>Open times</label>
                    {timeSlots.length === 0 ? (
                      <p className="text-sm text-gray-500">
                        No times added yet.
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {timeSlots.map((slot) => (
                          <span
                            key={slot}
                            className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-3 py-1 text-xs font-medium text-secondary-pink"
                          >
                            {formatTryOnTimeSlot(slot)}
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={() => removeTime(slot)}
                              aria-label={`Remove ${slot}`}
                              className="text-secondary-pink hover:text-rose-900"
                            >
                              ×
                            </Button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="mt-6 flex items-center gap-3">
                    <Button onClick={handleSave} disabled={isSubmitting}>
                      {isSubmitting ? "Saving…" : "Save"}
                    </Button>
                    {hasExistingAvailability && (
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={handleRemove}
                        className="text-red-500 hover:text-red-700 text-xs font-medium"
                      >
                        Remove this date
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default AdminTryOnAvailability;
