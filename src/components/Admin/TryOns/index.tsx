import React from "react";
import dayjs from "dayjs";
import { getAllTryOnBookings, updateTryOnBookingStatus } from "@/api/admin";
import Button from "@/components/Button";
import Spinner from "@/components/Spinner";
import Toast, { ToastType, ToastVariant } from "@/components/Toast";
import CreateTryOnBookingModal from "@/components/Admin/CreateTryOnBookingModal";
import AdminTryOnAvailability from "@/components/Admin/TryOnAvailability";
import { TryOnStatus } from "../../../../common/enums/TryOnStatus";
import { formatTryOnTimeSlot } from "../../../../common/constants/tryOn";

type TryOnBookingRow = {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  date: string;
  timeSlot: string;
  price: number;
  status: TryOnStatus;
  user?: { name?: string; email?: string }[];
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

const AdminTryOns = () => {
  const [bookings, setBookings] = React.useState<TryOnBookingRow[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [createModalOpen, setCreateModalOpen] = React.useState(false);
  const [toast, setToast] = React.useState<ToastType>({
    message: "",
    variant: ToastVariant.WARNING,
    show: false,
  });

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

  const onStatusChange = (bookingId: string, status: TryOnStatus) => {
    setBookings((prev) =>
      prev.map((b) => (b._id === bookingId ? { ...b, status } : b)),
    );

    updateTryOnBookingStatus(bookingId, status).catch(() =>
      setToast({
        message: "Failed to update status",
        variant: ToastVariant.WARNING,
        show: true,
      }),
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
                        Fee
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                      >
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {bookings.map((booking) => (
                      <tr key={booking._id}>
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm sm:pl-0">
                          <div className="font-medium">{booking.name}</div>
                          <div className="text-gray-500">{booking.email}</div>
                          {booking.phone && (
                            <div className="text-gray-500">
                              {booking.phone}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-4 text-sm text-gray-500">
                          {dayjs(booking.date).format("MMMM D, YYYY")}
                        </td>
                        <td className="px-3 py-4 text-sm text-gray-500">
                          {formatTryOnTimeSlot(booking.timeSlot)}
                        </td>
                        <td className="px-3 py-4 text-sm text-gray-500">
                          ${booking.price.toFixed(2)}
                        </td>
                        <td className="px-3 py-4 text-sm">
                          <select
                            value={booking.status}
                            onChange={(e) =>
                              onStatusChange(
                                booking._id,
                                e.target.value as TryOnStatus,
                              )
                            }
                            className={`block rounded-md border-0 py-1.5 pl-3 pr-8 text-sm ring-1 ring-inset sm:leading-6 ${getStatusColour(
                              booking.status,
                            )}`}
                          >
                            {Object.values(TryOnStatus).map((status) => (
                              <option key={status} value={status}>
                                {status}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                    {bookings.length === 0 && (
                      <tr>
                        <td
                          colSpan={5}
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
