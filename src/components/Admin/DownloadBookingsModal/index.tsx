import React from "react";
import dayjs from "dayjs";
import Modal from "@/components/Modal";
import Button from "@/components/Button";
import { Booking } from "../../../../common/types";

interface DownloadBookingsModalProps {
  isOpen: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  bookings: Booking[];
  onDownload: (bookings: Booking[]) => void;
}

const DownloadBookingsModal = ({
  isOpen,
  setOpen,
  bookings,
  onDownload,
}: DownloadBookingsModalProps) => {
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());

  React.useEffect(() => {
    if (isOpen) setSelectedIds(new Set(bookings.map((b) => b._id as string)));
  }, [isOpen, bookings]);

  const allSelected =
    bookings.length > 0 && selectedIds.size === bookings.length;

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(bookings.map((b) => b._id as string)));
    }
  };

  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleDownload = () => {
    if (!selectedIds.size) return;
    onDownload(bookings.filter((b) => selectedIds.has(b._id as string)));
    setOpen(false);
  };

  return (
    <Modal isOpen={isOpen} setOpen={setOpen}>
      <h2 className="text-lg font-semibold text-gray-900 mb-1">
        Download bookings
      </h2>
      <p className="text-sm text-gray-500 mb-4">
        Select the dresses from this week&apos;s bookings to include in the
        CSV export.
      </p>

      <div className="overflow-y-auto max-h-[55vh] border border-gray-200 rounded-md">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th className="py-3 pl-4 pr-2 text-left">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  className="rounded border-gray-300 text-pink-600"
                />
              </th>
              <th className="py-3 px-3 text-left font-semibold text-gray-700">
                Dress
              </th>
              <th className="py-3 px-3 text-left font-semibold text-gray-700">
                User
              </th>
              <th className="py-3 px-3 text-left font-semibold text-gray-700">
                Date
              </th>
              <th className="py-3 px-3 text-left font-semibold text-gray-700">
                Size
              </th>
              <th className="py-3 px-3 text-left font-semibold text-gray-700">
                Delivery
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {bookings.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-gray-400">
                  No bookings to display.
                </td>
              </tr>
            ) : (
              bookings.map((booking) => {
                const id = booking._id as string;
                const checked = selectedIds.has(id);
                const user = (booking as any).user?.[0];
                return (
                  <tr
                    key={id}
                    className={`cursor-pointer hover:bg-gray-50 ${checked ? "bg-pink-50" : ""}`}
                    onClick={() => toggleOne(id)}
                  >
                    <td className="py-3 pl-4 pr-2">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleOne(id)}
                        onClick={(e) => e.stopPropagation()}
                        className="rounded border-gray-300 text-pink-600"
                      />
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        {booking.dress?.images?.[0] && (
                          <img
                            src={booking.dress.images[0]}
                            alt={booking.dress.name}
                            className="h-8 w-8 rounded-full object-cover flex-shrink-0"
                          />
                        )}
                        <div>
                          <div className="font-medium text-gray-900">
                            {booking.dress?.name}
                          </div>
                          <div className="text-gray-500 text-xs">
                            {booking.dress?.brand}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="text-gray-900">{user?.name}</div>
                      <div className="text-gray-500 text-xs">{user?.email}</div>
                    </td>
                    <td className="py-3 px-3 text-gray-600 whitespace-nowrap">
                      {dayjs(booking.dateBooked).format("MMM D, YYYY")}
                    </td>
                    <td className="py-3 px-3 text-gray-600">{booking.size}</td>
                    <td className="py-3 px-3">
                      <span className="inline-flex rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
                        {booking.deliveryType}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <span className="text-sm text-gray-500">
          {selectedIds.size} of {bookings.length} selected
        </span>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-md px-4 py-2 text-sm text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
          >
            Cancel
          </button>
          <Button onClick={handleDownload} disabled={selectedIds.size === 0}>
            {`Download${selectedIds.size > 0 ? ` (${selectedIds.size})` : ""}`}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default DownloadBookingsModal;
