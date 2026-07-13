import React from "react";
import dayjs from "dayjs";
import Modal from "@/components/Modal";
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
          src={booking?.dress?.images?.[0]}
          alt={booking?.dress?.name ?? ""}
          className="h-20 w-20 flex-none rounded-lg object-cover"
        />
        <div className="space-y-1 text-sm">
          <p className="font-medium text-gray-900">{booking?.dress?.name}</p>
          <p className="text-gray-500">{booking?.dress?.brand}</p>
          <p>
            <span className="font-medium">Booked by:</span>{" "}
            {booking?.user?.[0]?.name} ({booking?.user?.[0]?.email})
          </p>
          <p>
            <span className="font-medium">Date:</span>{" "}
            {booking?.dateBooked
              ? dayjs(booking.dateBooked).format("MMMM D, YYYY")
              : ""}
          </p>
          <p>
            <span className="font-medium">Size:</span> {booking?.size}
          </p>
          <p>
            <span className="font-medium">Status:</span> {booking?.status}
          </p>
        </div>
      </div>

      <p className="mt-4 text-sm text-gray-700">
        Are you sure you want to delete this booking? This action cannot be
        undone.
      </p>

      <div className="flex justify-end gap-3 pt-6">
        <button
          type="button"
          onClick={() => setOpen(false)}
          disabled={isSubmitting}
          className="rounded-md px-4 py-2 text-sm text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={isSubmitting}
          className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 disabled:opacity-50"
        >
          {isSubmitting ? "Deleting…" : "Delete"}
        </button>
      </div>
    </Modal>
  );
};

export default DeleteBookingModal;
