import React from "react";
import Modal from "@/components/Modal";
import Button from "@/components/Button";
import { getAllAdminUsers, updateAdminTryOnBooking } from "@/api/admin";
import { getTakenTryOnSlots } from "@/api/tryOnBooking";
import { UserType } from "../../../../common/types";
import {
  TRY_ON_NOTES_MAX_LENGTH,
  formatTryOnTimeSlot,
} from "../../../../common/constants/tryOn";

type TryOnBookingRow = {
  _id: string;
  userId?: string;
  name: string;
  email: string;
  phone?: string;
  date: string;
  timeSlot: string;
  notes?: string;
};

interface IEditTryOnBookingModal {
  isOpen: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  booking: TryOnBookingRow | null;
  onEdited: () => void;
  onError: (message: string) => void;
}

const inputCls =
  "block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 sm:text-sm sm:leading-6";
const labelCls = "block text-sm font-medium text-gray-700 mb-1";

const EditTryOnBookingModal = ({
  isOpen,
  setOpen,
  booking,
  onEdited,
  onError,
}: IEditTryOnBookingModal) => {
  const [users, setUsers] = React.useState<UserType[]>([]);
  const [customerMode, setCustomerMode] = React.useState<"existing" | "new">(
    "existing",
  );
  const [userId, setUserId] = React.useState("");
  const [newUserEmail, setNewUserEmail] = React.useState("");
  const [newUserFirstName, setNewUserFirstName] = React.useState("");
  const [newUserLastName, setNewUserLastName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [date, setDate] = React.useState("");
  const [timeSlot, setTimeSlot] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [availableSlots, setAvailableSlots] = React.useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!isOpen) return;
    getAllAdminUsers()
      .then((res) => setUsers(res.data as UserType[]))
      .catch(() => {});
  }, [isOpen]);

  React.useEffect(() => {
    if (!isOpen || !booking) return;
    setCustomerMode("existing");
    setUserId(booking.userId ?? "");
    setNewUserEmail("");
    setNewUserFirstName("");
    setNewUserLastName("");
    setPhone(booking.phone ?? "");
    setDate(booking.date);
    setTimeSlot(booking.timeSlot);
    setNotes(booking.notes ?? "");
  }, [booking, isOpen]);

  // Keyed on the date, so changing it reloads the slots and drops a selection
  // that no longer exists — but this booking's own slot is added back on its
  // own date, where it reads as taken because this very row holds it.
  React.useEffect(() => {
    if (!date || !booking) {
      setAvailableSlots([]);
      return;
    }
    const isOwnDate = date === booking.date;
    setTimeSlot(isOwnDate ? booking.timeSlot : "");
    getTakenTryOnSlots(date)
      .then((res) => {
        const open: string[] = res.data.availableSlots ?? [];
        setAvailableSlots(
          isOwnDate && !open.includes(booking.timeSlot)
            ? [...open, booking.timeSlot].sort()
            : open,
        );
      })
      .catch(() => setAvailableSlots(isOwnDate ? [booking.timeSlot] : []));
  }, [date, booking]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!booking?._id) return;
    const customerInvalid =
      customerMode === "existing"
        ? !userId
        : !newUserEmail || !newUserFirstName || !newUserLastName;
    if (customerInvalid || !date || !timeSlot) {
      onError("Please fill in all required fields");
      return;
    }
    setIsSubmitting(true);
    try {
      await updateAdminTryOnBooking(booking._id, {
        ...(customerMode === "existing"
          ? { userId }
          : {
              newUser: {
                email: newUserEmail,
                firstName: newUserFirstName,
                lastName: newUserLastName,
              },
            }),
        phone: phone || undefined,
        date,
        timeSlot,
        notes,
      });
      onEdited();
      setOpen(false);
    } catch (err: any) {
      onError(
        err?.response?.data?.message ??
          err?.message ??
          "Failed to update try-on booking",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} setOpen={setOpen}>
      <h2 className="text-lg font-semibold text-gray-900 mb-1">
        Edit Try-On Booking
      </h2>
      <p className="text-sm text-gray-500 mb-6">{booking?.email ?? " "}</p>
      <form
        onSubmit={handleSubmit}
        className="space-y-6 max-h-[75vh] overflow-y-auto pr-1"
      >
        <div>
          <label className={labelCls}>Customer</label>
          <div className="flex gap-4 mb-3">
            {(["existing", "new"] as const).map((mode) => (
              <label
                key={mode}
                className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer"
              >
                <input
                  type="radio"
                  name="editTryOnCustomerMode"
                  value={mode}
                  checked={customerMode === mode}
                  onChange={() => {
                    setCustomerMode(mode);
                    setUserId("");
                    setNewUserEmail("");
                    setNewUserFirstName("");
                    setNewUserLastName("");
                  }}
                />
                {mode === "existing" ? "Existing customer" : "New customer"}
              </label>
            ))}
          </div>

          {customerMode === "existing" ? (
            <select
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className={inputCls}
              required
            >
              <option value="">Select a customer…</option>
              {users.map((u) => (
                <option key={u._id ?? u.email} value={u._id ?? ""}>
                  {u.name} - {u.email}
                </option>
              ))}
            </select>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className={labelCls}>Email</label>
                <input
                  type="email"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  required
                  className={inputCls}
                  placeholder="customer@example.com"
                />
              </div>
              <div>
                <label className={labelCls}>First name</label>
                <input
                  type="text"
                  value={newUserFirstName}
                  onChange={(e) => setNewUserFirstName(e.target.value)}
                  required
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Last name</label>
                <input
                  type="text"
                  value={newUserLastName}
                  onChange={(e) => setNewUserLastName(e.target.value)}
                  required
                  className={inputCls}
                />
              </div>
            </div>
          )}
        </div>

        <div>
          <label className={labelCls}>
            Phone <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={inputCls}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls}>Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={inputCls}
              required
            />
          </div>

          <div>
            <label className={labelCls}>Time slot</label>
            <select
              value={timeSlot}
              onChange={(e) => setTimeSlot(e.target.value)}
              className={inputCls}
              disabled={!date || availableSlots.length === 0}
              required
            >
              <option value="">
                {!date
                  ? "Select a date first…"
                  : availableSlots.length === 0
                    ? "No slots available for this date"
                    : "Select a time…"}
              </option>
              {availableSlots.map((slot) => (
                <option key={slot} value={slot}>
                  {formatTryOnTimeSlot(slot)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className={labelCls}>
            Notes <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            maxLength={TRY_ON_NOTES_MAX_LENGTH}
            className={inputCls}
            placeholder="Dresses the customer wants to try, sizes, anything to prep"
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setOpen(false)}
            className="rounded-md px-4 py-2 text-sm text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default EditTryOnBookingModal;
