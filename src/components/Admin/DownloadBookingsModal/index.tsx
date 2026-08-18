import React from "react";
import dayjs from "dayjs";
import Modal from "@/components/Modal";
import Button from "@/components/Button";
import {
  Booking,
  BookingItem,
  BookingLineItem,
} from "../../../../common/types";
import { sizedImageUrl } from "../../../../sanity/lib/image";

interface DownloadBookingsModalProps {
  isOpen: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  lineItems: BookingLineItem[];
  onDownload: (lineItems: BookingLineItem[]) => void | Promise<void>;
}

type BookingGroup = {
  id: string;
  booking: Booking;
  items: BookingItem[];
};

// The CSV emits one row per booking — a three-dress order is one parcel and one
// label — so the picker selects bookings, not dresses. Grouping here is what
// makes the count on the button match the number of rows you get.
const groupByBooking = (lineItems: BookingLineItem[]): BookingGroup[] => {
  const groups = new Map<string, BookingGroup>();

  lineItems.forEach(({ booking, item }) => {
    const id = String(booking._id);
    const existing = groups.get(id);
    if (existing) {
      existing.items.push(item);
    } else {
      groups.set(id, { id, booking, items: [item] });
    }
  });

  return [...groups.values()];
};

const DownloadBookingsModal = ({
  isOpen,
  setOpen,
  lineItems,
  onDownload,
}: DownloadBookingsModalProps) => {
  const groups = React.useMemo(() => groupByBooking(lineItems), [lineItems]);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());

  React.useEffect(() => {
    if (isOpen) setSelectedIds(new Set(groups.map((g) => g.id)));
  }, [isOpen, groups]);

  const allSelected = groups.length > 0 && selectedIds.size === groups.length;

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(groups.map((g) => g.id)));
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
    onDownload(
      lineItems.filter((li) => selectedIds.has(String(li.booking._id))),
    );
    setOpen(false);
  };

  return (
    <Modal isOpen={isOpen} setOpen={setOpen} maxWidthClassName="sm:max-w-4xl">
      <h2 className="text-lg font-semibold text-gray-900 mb-1">
        Download bookings
      </h2>
      <p className="text-sm text-gray-500 mb-4">
        Select the bookings from this week&apos;s and next week&apos;s to
        include in the CSV export. Each booking exports as one row, so an order
        with several dresses becomes a single label.
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
                Dresses
              </th>
              <th className="py-3 px-3 text-left font-semibold text-gray-700">
                User
              </th>
              <th className="py-3 px-3 text-left font-semibold text-gray-700">
                Date
              </th>
              <th className="py-3 px-3 text-left font-semibold text-gray-700">
                Delivery
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {groups.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-gray-400">
                  No bookings to display.
                </td>
              </tr>
            ) : (
              groups.map(({ id, booking, items }) => {
                const checked = selectedIds.has(id);
                const user = booking.user?.[0];
                const hasBeenDownloaded = Boolean(booking.downloadedAt);
                const dates = [
                  ...new Set(
                    items.map((item) =>
                      dayjs(item.dateBooked).format("MMM D, YYYY"),
                    ),
                  ),
                ];
                const deliveryTypes = [
                  ...new Set(items.map((item) => item.deliveryType)),
                ];

                return (
                  <tr
                    key={id}
                    className={`cursor-pointer hover:bg-gray-50 ${checked ? "bg-pink-50" : ""}`}
                    onClick={() => toggleOne(id)}
                  >
                    <td className="py-3 pl-4 pr-2 align-top">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleOne(id)}
                        onClick={(e) => e.stopPropagation()}
                        className="rounded border-gray-300 text-pink-600"
                      />
                    </td>
                    <td className="py-3 px-3 align-top">
                      <div className="flex flex-col gap-2">
                        {items.map((item, index) => (
                          <div
                            key={(item._id as string) ?? index}
                            className="flex items-center gap-2"
                          >
                            {item.dress?.images?.[0] && (
                              <img
                                src={sizedImageUrl(item.dress.images[0], {
                                  width: 64,
                                })}
                                alt={item.dress.name}
                                className="h-8 w-8 rounded-full object-cover flex-shrink-0"
                              />
                            )}
                            <div>
                              <div className="font-medium text-gray-900">
                                {item.dress?.name}
                              </div>
                              <div className="text-gray-500 text-xs">
                                {item.dress?.brand}
                                {item.size ? ` · Size ${item.size}` : ""}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      {items.length > 1 && (
                        <div className="mt-2 text-xs text-gray-500">
                          {items.length} dresses in this booking - one label
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3 align-top">
                      <div className="text-gray-900">{user?.name}</div>
                      <div className="text-gray-500 text-xs">{user?.email}</div>
                    </td>
                    <td className="py-3 px-3 align-top text-gray-600 whitespace-nowrap">
                      {dates.map((date) => (
                        <div key={date}>{date}</div>
                      ))}
                    </td>
                    <td className="py-3 px-3 align-top">
                      <div className="flex flex-wrap items-center gap-1">
                        {deliveryTypes.map((type) => (
                          <span
                            key={type}
                            className="inline-flex rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-700"
                          >
                            {type}
                          </span>
                        ))}
                        {hasBeenDownloaded && (
                          <span
                            title={`Already downloaded: ${dayjs(booking.downloadedAt).format("MMM D, YYYY h:mm A")}`}
                            className="inline-flex rounded-md bg-amber-100 px-2 py-0.5 text-xs text-amber-800"
                          >
                            Already downloaded
                          </span>
                        )}
                      </div>
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
          {selectedIds.size} of {groups.length} selected
        </span>
        <div className="flex gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setOpen(false)}
            className="rounded-md px-4 py-2 text-sm text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
          >
            Cancel
          </Button>
          <Button onClick={handleDownload} disabled={selectedIds.size === 0}>
            {`Download${selectedIds.size > 0 ? ` (${selectedIds.size})` : ""}`}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default DownloadBookingsModal;
