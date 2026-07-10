import React from "react";
import Modal from "@/components/Modal";
import Button from "@/components/Button";
import { getAllAdminUsers, createAdminTryOnBooking } from "@/api/admin";
import { UserType } from "../../../../common/types";
import Toast, { ToastType, ToastVariant } from "@/components/Toast";
import {
  TRY_ON_TIME_SLOTS,
  formatTryOnTimeSlot,
} from "../../../../common/constants/tryOn";

interface ICreateTryOnBookingModal {
  isOpen: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  onCreated: () => void;
}

const CreateTryOnBookingModal = ({
  isOpen,
  setOpen,
  onCreated,
}: ICreateTryOnBookingModal) => {
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
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [toast, setToast] = React.useState<ToastType>({
    message: "",
    variant: ToastVariant.WARNING,
    show: false,
  });

  React.useEffect(() => {
    if (!isOpen) return;
    getAllAdminUsers()
      .then((res) => setUsers(res.data as UserType[]))
      .catch(() => {});
  }, [isOpen]);

  const resetForm = () => {
    setUserId("");
    setNewUserEmail("");
    setNewUserFirstName("");
    setNewUserLastName("");
    setPhone("");
    setDate("");
    setTimeSlot("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const customerInvalid =
      customerMode === "existing"
        ? !userId
        : !newUserEmail || !newUserFirstName || !newUserLastName;
    if (customerInvalid || !date || !timeSlot) {
      setToast({
        message: "Please fill in all required fields",
        variant: ToastVariant.WARNING,
        show: true,
      });
      return;
    }
    setIsSubmitting(true);
    try {
      await createAdminTryOnBooking({
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
      });
      onCreated();
      setOpen(false);
      resetForm();
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ?? "Failed to create try-on booking";
      setToast({ message: msg, variant: ToastVariant.WARNING, show: true });
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputCls =
    "block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 sm:text-sm sm:leading-6";
  const labelCls = "block text-sm font-medium text-gray-700 mb-1";

  return (
    <>
      <Toast toast={toast} setToast={setToast} />
      <Modal isOpen={isOpen} setOpen={setOpen}>
        <h2 className="text-lg font-semibold text-gray-900 mb-6">
          Create Try-On Booking
        </h2>
        <form onSubmit={handleSubmit} className="space-y-6">
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
                    name="tryOnCustomerMode"
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
                required
              >
                <option value="">Select a time…</option>
                {TRY_ON_TIME_SLOTS.map((slot) => (
                  <option key={slot} value={slot}>
                    {formatTryOnTimeSlot(slot)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md px-4 py-2 text-sm text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
            >
              Cancel
            </button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating…" : "Create booking"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
};

export default CreateTryOnBookingModal;
