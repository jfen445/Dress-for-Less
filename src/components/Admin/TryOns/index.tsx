import React from "react";
import { getAllTryOnBookings } from "@/api/admin";
import Button from "@/components/Button";
import Spinner from "@/components/Spinner";
import Toast, { ToastType, ToastVariant } from "@/components/Toast";
import CreateTryOnBookingModal from "@/components/Admin/CreateTryOnBookingModal";
import DeleteTryOnBookingModal from "@/components/Admin/DeleteTryOnBookingModal";
import EmailTryOnRemindersModal from "@/components/Admin/EmailTryOnRemindersModal";
import AdminTryOnAvailability from "@/components/Admin/TryOnAvailability";
import { formatTryOnTimeSlot } from "../../../../common/constants/tryOn";
import { auckland } from "../../../../lib/utils/timezone";

type TryOnBookingRow = {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  date: string;
  timeSlot: string;
  price: number;
  notes?: string;
  user?: { name?: string; email?: string }[];
};

const previousMonday = (d = auckland.now()) => {
  // .day(): Sunday = 0, Monday = 1, ..., Saturday = 6
  const daysToSubtract = (d.day() + 6) % 7; // 0 when Monday, 1 when Tuesday, ..., 6 when Sunday
  return d.subtract(daysToSubtract, "day").startOf("day");
};

const AdminTryOns = () => {
  const [bookings, setBookings] = React.useState<TryOnBookingRow[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [createModalOpen, setCreateModalOpen] = React.useState(false);
  const [emailModalOpen, setEmailModalOpen] = React.useState(false);
  const [deleteTarget, setDeleteTarget] =
    React.useState<TryOnBookingRow | null>(null);
  const [toast, setToast] = React.useState<ToastType>({
    message: "",
    variant: ToastVariant.WARNING,
    show: false,
  });

  const [showThisWeek, setShowThisWeek] = React.useState(true);
  const [showUpcoming, setShowUpcoming] = React.useState(true);
  const [showPrevious, setShowPrevious] = React.useState(false);

  const fetchBookings = () => {
    setIsLoading(true);
    getAllTryOnBookings()
      .then((data) => setBookings(data.data))
      .catch(() =>
        setToast({
          message: "Failed to load try-on bookings",
          variant: ToastVariant.ERROR,
          show: true,
        }),
      )
      .finally(() => setIsLoading(false));
  };

  React.useEffect(() => {
    fetchBookings();
  }, []);

  const { thisWeekBookings, upcomingBookings, pastBookings, reminderBookings } =
    React.useMemo(() => {
      // Auckland, not the admin's own clock: a "YYYY-MM-DD" booking date is a
      // wall-clock day in the shop's zone, so comparing it against a Sydney or
      // UTC "now" shifts the week boundaries by a day.
      const now = auckland.now();
      const monday = previousMonday(now);
      const currentSunday = monday.add(6, "day").endOf("day");
      const nextSunday = currentSunday.add(7, "day");

      // Both bounds inclusive. `isAfter(monday)` dropped any booking dated on
      // the week's Monday: it parses to exactly Monday 00:00, so it was neither
      // after Monday nor before it, and fell out of all three lists.
      const dayOf = (b: TryOnBookingRow) => auckland.startOfDay(b.date);
      const inWeek = (b: TryOnBookingRow, until: typeof currentSunday) =>
        !dayOf(b).isBefore(monday) && !dayOf(b).isAfter(until);

      const sorted = [...bookings].sort((a, b) => dayOf(a).diff(dayOf(b)));

      const thisWeek = sorted.filter((b) => inWeek(b, currentSunday));
      const upcoming = sorted.filter((b) => dayOf(b).isAfter(currentSunday));
      const past = sorted
        .filter((b) => dayOf(b).isBefore(monday))
        .sort((a, b) => dayOf(b).diff(dayOf(a)));

      const reminders = sorted.filter((b) => inWeek(b, nextSunday));

      return {
        thisWeekBookings: thisWeek,
        upcomingBookings: upcoming,
        pastBookings: past,
        reminderBookings: reminders,
      };
    }, [bookings]);

  const renderTryOnRow = (bookingList: TryOnBookingRow[]) => {
    return (
      <>
        {bookingList.map((booking) => (
          <tr key={booking._id}>
            <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm sm:pl-0">
              <div className="font-medium">{booking.name}</div>
              <div className="text-gray-500">{booking.email}</div>
              {booking.phone && (
                <div className="text-gray-500">{booking.phone}</div>
              )}
            </td>
            <td className="px-3 py-4 text-sm text-gray-500">
              {auckland.format(booking.date, "MMMM D, YYYY")}
            </td>
            <td className="px-3 py-4 text-sm text-gray-500">
              {formatTryOnTimeSlot(booking.timeSlot)}
            </td>
            <td className="max-w-xs px-3 py-4 text-sm text-gray-500">
              {booking.notes ? (
                <span className="whitespace-pre-wrap break-words">
                  {booking.notes}
                </span>
              ) : (
                <span className="text-gray-300">—</span>
              )}
            </td>
            <td className="px-3 py-4 text-sm text-gray-500">
              ${booking.price.toFixed(2)}
            </td>
            <td className="px-3 py-4 text-right text-sm">
              <button
                type="button"
                onClick={() => setDeleteTarget(booking)}
                className="text-red-600 hover:underline"
              >
                Delete
              </button>
            </td>
          </tr>
        ))}
      </>
    );
  };

  return (
    <>
      <Toast toast={toast} setToast={setToast} />
      <CreateTryOnBookingModal
        isOpen={createModalOpen}
        setOpen={setCreateModalOpen}
        onCreated={() => {
          fetchBookings();
          setToast({
            message: "Try-on booking created successfully",
            variant: ToastVariant.SUCCESS,
            show: true,
          });
        }}
      />
      <DeleteTryOnBookingModal
        isOpen={!!deleteTarget}
        setOpen={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        booking={deleteTarget}
        onDeleted={(bookingId) => {
          setBookings((prev) => prev.filter((b) => b._id !== bookingId));
          setToast({
            message: "Try-on booking deleted",
            variant: ToastVariant.SUCCESS,
            show: true,
          });
        }}
        onError={(message) =>
          setToast({ message, variant: ToastVariant.WARNING, show: true })
        }
      />
      <EmailTryOnRemindersModal
        isOpen={emailModalOpen}
        setOpen={setEmailModalOpen}
        bookings={reminderBookings}
        onSent={(message) =>
          setToast({ message, variant: ToastVariant.SUCCESS, show: true })
        }
        onError={(message) =>
          setToast({ message, variant: ToastVariant.WARNING, show: true })
        }
      />
      <AdminTryOnAvailability />
      <div className="p-4 sm:px-6 lg:px-8">
        <div className="sm:flex sm:items-center">
          <div className="sm:flex-auto">
            <h1 className="text-base font-semibold leading-6 text-gray-900">
              Try-On Bookings
            </h1>
            <p className="mt-2 text-sm text-gray-700">
              A list of all booked try-on sessions.
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setEmailModalOpen(true)}>Email</Button>
            <Button onClick={() => setCreateModalOpen(true)}>
              New try-on booking
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center">
            <Spinner />
          </div>
        ) : (
          <div className="mt-8 flow-root">
            <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
              <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                <table className="min-w-full divide-y divide-gray-300">
                  <thead>
                    <tr>
                      <th
                        scope="col"
                        className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-0"
                      >
                        Customer
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                      >
                        Date
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                      >
                        Time
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                      >
                        Notes
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                      >
                        Fee
                      </th>
                      <th scope="col" className="px-3 py-3.5">
                        <span className="sr-only">Delete</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    <tr
                      className="border-t border-gray-200 cursor-pointer"
                      onClick={() => setShowThisWeek(!showThisWeek)}
                    >
                      <th
                        scope="colgroup"
                        colSpan={6}
                        className="bg-gray-50 py-2 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-3"
                      >
                        This week try-ons
                      </th>
                    </tr>
                    {showThisWeek && renderTryOnRow(thisWeekBookings)}

                    <tr
                      className="border-t border-gray-200 cursor-pointer"
                      onClick={() => setShowUpcoming(!showUpcoming)}
                    >
                      <th
                        scope="colgroup"
                        colSpan={6}
                        className="bg-gray-50 py-2 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-3"
                      >
                        Upcoming try-ons
                      </th>
                    </tr>
                    {showUpcoming && renderTryOnRow(upcomingBookings)}

                    <tr
                      className="border-t border-gray-200 cursor-pointer"
                      onClick={() => setShowPrevious(!showPrevious)}
                    >
                      <th
                        scope="colgroup"
                        colSpan={6}
                        className="bg-gray-50 py-2 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-3"
                      >
                        Previous try-ons
                      </th>
                    </tr>
                    {showPrevious && renderTryOnRow(pastBookings)}

                    {bookings.length === 0 && (
                      <tr>
                        <td
                          colSpan={6}
                          className="py-6 text-center text-sm text-gray-500"
                        >
                          No try-on bookings yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default AdminTryOns;
