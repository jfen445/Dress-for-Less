import React from "react";
import dayjs from "dayjs";
import Modal from "@/components/Modal";
import Button from "@/components/Button";
import { deleteTryOnBooking } from "@/api/admin";
import { formatTryOnTimeSlot } from "../../../../common/constants/tryOn";

type TryOnBookingRow = {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  date: string;
  timeSlot: string;
  price: number;
};

interface IDeleteTryOnBookingModal {
  isOpen: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  booking: TryOnBookingRow | null;
  onDeleted: (bookingId: string) => void;
  onError: (message: string) => void;
}

const DeleteTryOnBookingModal = ({
  isOpen,
  setOpen,
  booking,
  onDeleted,
  onError,
}: IDeleteTryOnBookingModal) => {
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleConfirm = async () => {
    if (!booking?._id) return;
    setIsSubmitting(true);
    try {
      await deleteTryOnBooking(booking._id);
      onDeleted(booking._id);
      setOpen(false);
    } catch (err: any) {
      onError(err?.message ?? "Failed to delete try-on booking");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} setOpen={setOpen}>
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        Delete try-on booking
      </h2>

      <div className="space-y-1 text-sm">
        <p className="font-medium text-gray-900">{booking?.name}</p>
        <p className="text-gray-500">{booking?.email}</p>
        {booking?.phone && <p className="text-gray-500">{booking.phone}</p>}
        <p>
          <span className="font-medium">Date:</span>{" "}
          {booking?.date ? dayjs(booking.date).format("MMMM D, YYYY") : ""}
        </p>
        <p>
          <span className="font-medium">Time:</span>{" "}
          {booking?.timeSlot ? formatTryOnTimeSlot(booking.timeSlot) : ""}
        </p>
      </div>

      <p className="mt-4 text-sm text-gray-700">
        Are you sure you want to delete this try-on booking? This action
        cannot be undone.
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

export default DeleteTryOnBookingModal;
