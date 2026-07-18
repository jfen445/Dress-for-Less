import React from "react";
import dayjs from "dayjs";
import Modal from "@/components/Modal";
import Button from "@/components/Button";
import { deleteBooking } from "@/api/booking";
import { Booking } from "../../../../common/types";

interface IDeleteBookingModal {
  isOpen: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  booking: Booking | null;
  onDeleted: (bookingId: string) => void;
  onError: (message: string) => void;
}

const DeleteBookingModal = ({
  isOpen,
  setOpen,
  booking,
  onDeleted,
  onError,
}: IDeleteBookingModal) => {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const primaryItem = booking?.items[0];
  const extraCount = (booking?.items.length ?? 0) - 1;

  const handleConfirm = async () => {
    if (!booking?._id) return;
    setIsSubmitting(true);
    try {
      await deleteBooking(booking._id);
      onDeleted(booking._id);
      setOpen(false);
    } catch (err: any) {
      onError(err?.message ?? "Failed to delete booking");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} setOpen={setOpen}>
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        Delete booking
      </h2>

      <div className="flex space-x-4">
        <img
          src={primaryItem?.dress?.images?.[0]}
          alt={primaryItem?.dress?.name ?? ""}
          className="h-20 w-20 flex-none rounded-lg object-cover"
        />
        <div className="space-y-1 text-sm">
          <p className="font-medium text-gray-900">
            {primaryItem?.dress?.name}
            {extraCount > 0 && (
              <span className="ml-2 font-normal text-gray-400">
                +{extraCount} more
              </span>
            )}
          </p>
          <p className="text-gray-500">{primaryItem?.dress?.brand}</p>
          <p>
            <span className="font-medium">Booked by:</span>{" "}
            {booking?.user?.[0]?.name} ({booking?.user?.[0]?.email})
          </p>
          <p>
            <span className="font-medium">Date:</span>{" "}
            {primaryItem?.dateBooked
              ? dayjs(primaryItem.dateBooked).format("MMMM D, YYYY")
              : ""}
          </p>
          <p>
            <span className="font-medium">Size:</span> {primaryItem?.size}
          </p>
          <p>
            <span className="font-medium">Status:</span> {booking?.status}
          </p>
        </div>
      </div>

      <p className="mt-4 text-sm text-gray-700">
        Are you sure you want to delete this booking
        {extraCount > 0 ? " and all its items" : ""}? This action cannot be
        undone.
      </p>

      <div className="flex justify-end gap-3 pt-6">
        <Button
          type="button"
          variant="ghost"
          onClick={() => setOpen(false)}
          disabled={isSubmitting}
          className="rounded-md px-4 py-2 text-sm text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
        >
          Cancel
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={handleConfirm}
          disabled={isSubmitting}
          className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500"
        >
          {isSubmitting ? "Deleting…" : "Delete"}
        </Button>
      </div>
    </Modal>
  );
};

export default DeleteBookingModal;
