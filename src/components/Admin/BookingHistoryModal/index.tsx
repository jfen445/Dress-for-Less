import React from "react";
import dayjs from "dayjs";
import Modal from "@/components/Modal";
import { BookingLineItem } from "../../../../common/types";
import { BookingStatus } from "../../../../common/enums/BookingStatus";

interface BookingHistoryModalProps {
  isOpen: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  title: string;
  subtitle?: string;
  image?: string;
  lineItems: BookingLineItem[];
}

const getStatusColour = (status: BookingStatus) => {
  switch (status) {
    case BookingStatus.BeingReturned:
      return "bg-purple-50 text-purple-700 ring-purple-600/20";
    case BookingStatus.Washing:
      return "bg-blue-50 text-blue-700 ring-blue-600/20";
    case BookingStatus.Drying:
      return "bg-lime-50 text-lime-700 ring-lime-600/20";
    case BookingStatus.Packed:
      return "bg-orange-50 text-orange-700 ring-orange-600/20";
    case BookingStatus.Delayed:
      return "bg-red-50 text-red-700 ring-red-600/20";
    case BookingStatus.Reparing:
      return "bg-stone-50 text-stone-700 ring-stone-600/20";
    case BookingStatus.Returned:
      return "bg-green-50 text-green-700 ring-green-600/20";
    case BookingStatus.NA:
    default:
      return "bg-gray-50 text-gray-700 ring-gray-600/20";
  }
};

const BookingHistoryModal = ({
  isOpen,
  setOpen,
  title,
  subtitle,
  image,
  lineItems,
}: BookingHistoryModalProps) => {
  const sortedLineItems = React.useMemo(
    () =>
      [...lineItems].sort((a, b) =>
        dayjs(b.item.dateBooked).diff(dayjs(a.item.dateBooked)),
      ),
    [lineItems],
  );

  return (
    <Modal isOpen={isOpen} setOpen={setOpen}>
      <div className="flex items-center gap-3 mb-4">
        {image && (
          <img
            src={image}
            alt={title}
            className="h-12 w-12 rounded-full object-cover flex-shrink-0"
          />
        )}
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
        </div>
      </div>

      <div className="overflow-y-auto max-h-[60vh] border border-gray-200 rounded-md">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th className="py-3 pl-4 pr-3 text-left font-semibold text-gray-700">
                Dress
              </th>
              <th className="py-3 px-3 text-left font-semibold text-gray-700">
                User
              </th>
              <th className="py-3 px-3 text-left font-semibold text-gray-700">
                Date Booked
              </th>
              <th className="py-3 px-3 text-left font-semibold text-gray-700">
                Size
              </th>
              <th className="py-3 px-3 text-left font-semibold text-gray-700">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {sortedLineItems.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-gray-400">
                  No booking history to display.
                </td>
              </tr>
            ) : (
              sortedLineItems.map(({ booking, item }) => {
                const user = booking.user?.[0];
                return (
                  <tr key={item._id ?? `${booking._id}-${item.dressId}`}>
                    <td className="py-3 pl-4 pr-3">
                      <div className="font-medium text-gray-900">
                        {item.dress?.name}
                      </div>
                      <div className="text-gray-500 text-xs">
                        {item.dress?.brand}
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="text-gray-900">{user?.name}</div>
                      <div className="text-gray-500 text-xs">{user?.email}</div>
                    </td>
                    <td className="py-3 px-3 text-gray-600 whitespace-nowrap">
                      {dayjs(item.dateBooked).format("MMM D, YYYY")}
                    </td>
                    <td className="py-3 px-3 text-gray-600">{item.size}</td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${getStatusColour(
                          booking.status,
                        )}`}
                      >
                        {booking.status}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </Modal>
  );
};

export default BookingHistoryModal;
