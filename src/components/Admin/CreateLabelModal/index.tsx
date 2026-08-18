import React from "react";
import dayjs from "dayjs";
import Modal from "@/components/Modal";
import Button from "@/components/Button";
import { Booking, BookingItem, BookingLineItem } from "../../../../common/types";
import { sizedImageUrl } from "../../../../sanity/lib/image";

interface CreateLabelModalProps {
  isOpen: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  lineItems: BookingLineItem[];
  onCreateLabels: (lineItems: BookingLineItem[]) => Promise<void>;
}

type BookingGroup = {
  id: string;
  booking: Booking;
  items: BookingItem[];
};

// pages/api/admin/labels.ts posts one consignment per booking, with a parcel
// per item — a three-dress order is one label. So the picker selects bookings,
// not dresses, and the count on the button matches the labels you get back.
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

const CreateLabelModal = ({
  isOpen,
  setOpen,
  lineItems,
  onCreateLabels,
}: CreateLabelModalProps) => {
  const groups = React.useMemo(() => groupByBooking(lineItems), [lineItems]);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [isCreating, setIsCreating] = React.useState(false);

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

  const handleCreate = async () => {
    if (!selectedIds.size) return;
    setIsCreating(true);
    try {
      await onCreateLabels(
        lineItems.filter((li) => selectedIds.has(String(li.booking._id))),
      );
      setOpen(false);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Modal isOpen={isOpen} setOpen={setOpen} maxWidthClassName="sm:max-w-4xl">
      <h2 className="text-lg font-semibold text-gray-900 mb-1">
        Create labels
      </h2>
      <p className="text-sm text-gray-500 mb-4">
        Select the bookings from this week&apos;s and next week&apos;s
        deliveries to create courier labels for. Each booking gets one label, so
        an order with several dresses ships as a single consignment.
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
                const hasExistingLabel = Boolean(booking.tracking);
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
                          {items.length} dresses in this booking — one
                          consignment, {items.length} parcels
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
                        {hasExistingLabel && (
                          <span
                            title={`Existing tracking: ${booking.tracking}`}
                            className="inline-flex rounded-md bg-amber-100 px-2 py-0.5 text-xs text-amber-800"
                          >
                            Label already created
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
            disabled={isCreating}
            className="rounded-md px-4 py-2 text-sm text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={selectedIds.size === 0 || isCreating}
          >
            {isCreating
              ? "Creating…"
              : `Create label(s)${selectedIds.size > 0 ? ` (${selectedIds.size})` : ""}`}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default CreateLabelModal;
