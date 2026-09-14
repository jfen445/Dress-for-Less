import React from "react";
import dayjs from "dayjs";
import Modal from "@/components/Modal";
import Button from "@/components/Button";
import { Booking, BookingItem, BookingLineItem } from "../../../../common/types";
import { sendBookingEmails } from "@/api/admin";
import { sizedImageUrl } from "../../../../sanity/lib/image";

interface EmailBookingsModalProps {
  isOpen: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  lineItems: BookingLineItem[];
  onSent: (message: string) => void;
  onError: (message: string) => void;
}

type BookingGroup = {
  bookingId: string;
  booking: Booking;
  items: BookingItem[];
};

// One row per order, not per dress: the email endpoint sends a single email
// covering every item in a booking, so a per-item checkbox offered a choice
// that doesn't exist.
const groupByBooking = (lineItems: BookingLineItem[]): BookingGroup[] => {
  const groups = new Map<string, BookingGroup>();

  for (const { booking, item } of lineItems) {
    const bookingId = String(booking._id);
    const group = groups.get(bookingId);
    if (group) group.items.push(item);
    else groups.set(bookingId, { bookingId, booking, items: [item] });
  }

  return [...groups.values()];
};

const EmailBookingsModal = ({
  isOpen,
  setOpen,
  lineItems,
  onSent,
  onError,
}: EmailBookingsModalProps) => {
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [isSending, setIsSending] = React.useState(false);

  const groups = React.useMemo(() => groupByBooking(lineItems), [lineItems]);

  React.useEffect(() => {
    if (isOpen) setSelectedIds(new Set());
  }, [isOpen]);

  const allSelected = groups.length > 0 && selectedIds.size === groups.length;

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(groups.map((group) => group.bookingId)));
    }
  };

  const toggleOne = (bookingId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(bookingId) ? next.delete(bookingId) : next.add(bookingId);
      return next;
    });
  };

  const handleSend = async () => {
    if (!selectedIds.size) return;
    setIsSending(true);
    try {
      const res = await sendBookingEmails([...selectedIds]);
      onSent(res.data?.message ?? "Emails sent successfully");
      setOpen(false);
    } catch {
      onError("Failed to send emails. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Modal isOpen={isOpen} setOpen={setOpen}>
      <h2 className="text-lg font-semibold text-gray-900 mb-1">
        Send booking instructions
      </h2>
      <p className="text-sm text-gray-500 mb-4">
        Select the orders to email pickup or delivery instructions to. Each order
        receives one email covering all of its dresses.
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
                Order
              </th>
              <th className="py-3 px-3 text-left font-semibold text-gray-700">
                User
              </th>
              <th className="py-3 px-3 text-left font-semibold text-gray-700">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {groups.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-8 text-center text-gray-400">
                  No bookings to display.
                </td>
              </tr>
            ) : (
              groups.map(({ bookingId, booking, items }) => {
                const checked = selectedIds.has(bookingId);
                const user = booking.user?.[0];
                const hasBeenEmailed = Boolean(booking.instructionsSentAt);
                // Listed once per method rather than once per dress, since the
                // methods are already shown against each dress below.
                const methods = [
                  ...new Set(items.map((item) => item.deliveryType as string)),
                ];
                return (
                  <tr
                    key={bookingId}
                    className={`cursor-pointer hover:bg-gray-50 ${checked ? "bg-pink-50" : ""}`}
                    onClick={() => toggleOne(bookingId)}
                  >
                    <td className="py-3 pl-4 pr-2 align-top">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleOne(bookingId)}
                        onClick={(e) => e.stopPropagation()}
                        className="mt-1 rounded border-gray-300 text-pink-600"
                      />
                    </td>
                    <td className="py-3 px-3 align-top">
                      {booking.orderNumber && (
                        <div className="mb-2 text-xs text-gray-500">
                          #{booking.orderNumber}
                        </div>
                      )}
                      <div className="flex flex-col gap-3">
                        {items.map((item, index) => (
                          <div
                            key={
                              (item._id as string) ??
                              `${item.dressId}-${item.dateBooked}-${index}`
                            }
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
                              </div>
                              <div className="text-gray-500 text-xs">
                                Size {item.size} ·{" "}
                                {dayjs(item.dateBooked).format("MMM D, YYYY")} ·{" "}
                                {item.deliveryType}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-3 align-top">
                      <div className="text-gray-900">{user?.name}</div>
                      <div className="text-gray-500 text-xs">{user?.email}</div>
                    </td>
                    <td className="py-3 px-3 align-top">
                      <div className="flex flex-wrap items-center gap-1">
                        {methods.map((method) => (
                          <span
                            key={method}
                            className="inline-flex rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-700"
                          >
                            {method}
                          </span>
                        ))}
                        {hasBeenEmailed && (
                          <span
                            title={`Already emailed: ${dayjs(booking.instructionsSentAt).format("MMM D, YYYY h:mm A")}`}
                            className="inline-flex rounded-md bg-amber-100 px-2 py-0.5 text-xs text-amber-800"
                          >
                            Already emailed
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
          {selectedIds.size} of {groups.length} order
          {groups.length !== 1 ? "s" : ""} selected
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
          <Button
            onClick={handleSend}
            disabled={selectedIds.size === 0 || isSending}
          >
            {isSending
              ? "Sending…"
              : `Send${selectedIds.size > 0 ? ` (${selectedIds.size})` : ""}`}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default EmailBookingsModal;
