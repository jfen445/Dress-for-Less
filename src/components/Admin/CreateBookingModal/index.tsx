import React from "react";
import Modal from "@/components/Modal";
import Button from "@/components/Button";
import Calendar from "@/components/ProductPage/Calendar";
import { useGlobalContext } from "@/context/GlobalContext";
import { getAllAdminUsers, createAdminBooking } from "@/api/admin";
import { DeliveryType } from "../../../../common/enums/DeliveryType";
import { UserType, Address, Sizes } from "../../../../common/types";
import Toast, { ToastType, ToastVariant } from "@/components/Toast";

const DELIVERY_FEES: Record<DeliveryType, number> = {
  [DeliveryType.Delivery]: 15,
  [DeliveryType.Pickup]: 0,
  [DeliveryType.PickupDelivery]: 7.5,
  [DeliveryType.DeliveryPickup]: 7.5,
};

const SIZES = ["XS", "S", "M", "L", "XL"] as const;

const emptyAddress = (): Address => ({
  company: "",
  address: "",
  apartment: "",
  suburb: "",
  city: "",
  country: "New Zealand",
  postCode: "",
});

const inputCls =
  "block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 sm:text-sm sm:leading-6";
const labelCls = "block text-sm font-medium text-gray-700 mb-1";

const AddressFields = ({
  value,
  onChange,
}: {
  value: Address;
  onChange: (field: keyof Address, val: string) => void;
}) => (
  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
    {(
      [
        { field: "address", label: "Address", required: true },
        { field: "apartment", label: "Apartment / Suite", required: false },
        { field: "suburb", label: "Suburb", required: true },
        { field: "city", label: "City", required: false },
        { field: "postCode", label: "Postal code", required: true },
        { field: "company", label: "Company", required: false },
      ] as { field: keyof Address; label: string; required: boolean }[]
    ).map(({ field, label, required }) => (
      <div key={field}>
        <label className={labelCls}>
          {label}{" "}
          {!required && (
            <span className="text-gray-400 font-normal">(optional)</span>
          )}
        </label>
        <input
          type="text"
          value={value[field] ?? ""}
          onChange={(e) => onChange(field, e.target.value)}
          required={required}
          className={inputCls}
        />
      </div>
    ))}
    <div>
      <label className={labelCls}>Country</label>
      <input
        type="text"
        value="New Zealand"
        disabled
        className={`${inputCls} bg-gray-100`}
      />
    </div>
  </div>
);

interface ICreateBookingModal {
  isOpen: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  onCreated: () => void;
}

const CreateBookingModal = ({
  isOpen,
  setOpen,
  onCreated,
}: ICreateBookingModal) => {
  const { allDresses } = useGlobalContext();
  const sortedDresses = React.useMemo(
    () => [...(allDresses ?? [])].sort((a, b) => a.name.localeCompare(b.name)),
    [allDresses],
  );
  const [users, setUsers] = React.useState<UserType[]>([]);
  const [customerMode, setCustomerMode] = React.useState<"existing" | "new">(
    "existing",
  );
  const [dressId, setDressId] = React.useState("");
  const [size, setSize] = React.useState("");
  const [userId, setUserId] = React.useState("");
  const [newUserEmail, setNewUserEmail] = React.useState("");
  const [newUserFirstName, setNewUserFirstName] = React.useState("");
  const [newUserLastName, setNewUserLastName] = React.useState("");
  const [dateBooked, setDateBooked] = React.useState("");
  const [deliveryType, setDeliveryType] = React.useState<DeliveryType>(
    DeliveryType.Delivery,
  );
  const [address, setAddress] = React.useState<Address>(emptyAddress());
  const [billingAddress, setBillingAddress] =
    React.useState<Address>(emptyAddress());
  const [instructions, setInstructions] = React.useState("");
  const [sameAsShipping, setSameAsShipping] = React.useState(true);
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

  React.useEffect(() => {
    if (sortedDresses.length > 0 && !dressId) {
      setDressId(sortedDresses[0]._id);
    }
  }, [sortedDresses, dressId]);

  const selectedDress = sortedDresses.find((d) => d._id === dressId);

  const availableSizes = SIZES.filter((s) => {
    if (!selectedDress) return false;
    const stock = parseInt(
      (selectedDress[
        s.toLowerCase() as keyof typeof selectedDress
      ] as string) ?? "0",
    );
    return stock > 0;
  });

  React.useEffect(() => {
    if (availableSizes.length > 0 && !availableSizes.includes(size as any)) {
      setSize(availableSizes[0]);
    }
  }, [dressId, availableSizes, size]);

  const needsAddress = deliveryType !== DeliveryType.Pickup;
  const dressPrice = selectedDress ? parseInt(selectedDress.price) : 0;
  const deliveryFee = DELIVERY_FEES[deliveryType];
  const totalDisplay = (dressPrice + deliveryFee).toFixed(2);

  const sizes: Sizes = selectedDress
    ? {
        xs: selectedDress.xs,
        s: selectedDress.s,
        m: selectedDress.m,
        l: selectedDress.l,
        xl: selectedDress.xl,
      }
    : {};

  const resetForm = () => {
    setCustomerMode("existing");
    setDressId(sortedDresses[0]?._id ?? "");
    setSize("");
    setUserId("");
    setNewUserEmail("");
    setNewUserFirstName("");
    setNewUserLastName("");
    setDateBooked("");
    setDeliveryType(DeliveryType.Delivery);
    setAddress(emptyAddress());
    setBillingAddress(emptyAddress());
    setInstructions("");
    setSameAsShipping(true);
  };

  const handleAddressChange = (field: keyof Address, value: string) => {
    setAddress((prev) => ({ ...prev, [field]: value }));
    if (sameAsShipping)
      setBillingAddress((prev) => ({ ...prev, [field]: value }));
  };

  const handleBillingChange = (field: keyof Address, value: string) => {
    setBillingAddress((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const customerInvalid =
      customerMode === "existing"
        ? !userId
        : !newUserEmail || !newUserFirstName || !newUserLastName;
    if (!dressId || customerInvalid || !dateBooked || !size) {
      setToast({
        message: "Please fill in all required fields including a date",
        variant: ToastVariant.WARNING,
        show: true,
      });
      return;
    }
    setIsSubmitting(true);
    try {
      await createAdminBooking({
        dressId,
        ...(customerMode === "existing"
          ? { userId }
          : {
              newUser: {
                email: newUserEmail,
                firstName: newUserFirstName,
                lastName: newUserLastName,
              },
            }),
        dateBooked,
        size,
        deliveryType,
        address: needsAddress ? address : undefined,
        billingAddress:
          sameAsShipping && needsAddress ? address : billingAddress,
        instructions,
      });
      onCreated();
      setOpen(false);
      resetForm();
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? "Failed to create booking";
      setToast({ message: msg, variant: ToastVariant.WARNING, show: true });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Toast toast={toast} setToast={setToast} />
      <Modal isOpen={isOpen} setOpen={setOpen}>
        <h2 className="text-lg font-semibold text-gray-900 mb-6">
          Create Booking
        </h2>
        <form
          onSubmit={handleSubmit}
          className="space-y-6 max-h-[75vh] overflow-y-auto pr-1"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Dress */}
            <div>
              <label className={labelCls}>Dress</label>
              <select
                value={dressId}
                onChange={(e) => {
                  setDressId(e.target.value);
                  setDateBooked("");
                }}
                className={inputCls}
                required
              >
                {sortedDresses.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Size */}
            <div>
              <label className={labelCls}>Size</label>
              <select
                value={size}
                onChange={(e) => {
                  setSize(e.target.value);
                  setDateBooked("");
                }}
                className={inputCls}
                required
              >
                {availableSizes.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* Customer toggle */}
            <div className="sm:col-span-2">
              <label className={labelCls}>Customer</label>
              <div className="flex gap-4 mb-3">
                {(["existing", "new"] as const).map((mode) => (
                  <label
                    key={mode}
                    className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer"
                  >
                    <input
                      type="radio"
                      name="customerMode"
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
          </div>

          {/* Calendar */}
          {dressId && size && (
            <div>
              <label className={`${labelCls} mb-0`}>Rental Date</label>
              <Calendar
                setSelectedDate={setDateBooked}
                sizes={sizes}
                selectedSize={size}
                dressId={dressId}
                isAdmin={true}
                deliveryType={deliveryType}
              />
              {dateBooked && (
                <p className="text-sm text-gray-500 mt-1">
                  Selected:{" "}
                  {new Date(dateBooked).toLocaleDateString("en-NZ", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              )}
            </div>
          )}

          {/* Delivery type */}
          <div>
            <label className={labelCls}>Delivery type</label>
            <select
              value={deliveryType}
              onChange={(e) => setDeliveryType(e.target.value as DeliveryType)}
              className={inputCls}
              required
            >
              {Object.values(DeliveryType).map((dt) => (
                <option key={dt} value={dt}>
                  {dt} - ${DELIVERY_FEES[dt].toFixed(2)}
                </option>
              ))}
            </select>
          </div>

          {/* Shipping address */}
          {needsAddress && (
            <div>
              <h3 className="text-sm font-semibold text-gray-800 mb-3">
                Shipping address
              </h3>
              <AddressFields value={address} onChange={handleAddressChange} />
            </div>
          )}

          {/* Billing address */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-800">
                Billing address
              </h3>
              {needsAddress && (
                <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sameAsShipping}
                    onChange={(e) => {
                      setSameAsShipping(e.target.checked);
                      if (e.target.checked) setBillingAddress({ ...address });
                    }}
                  />
                  Same as shipping
                </label>
              )}
            </div>
            {(!needsAddress || !sameAsShipping) && (
              <AddressFields
                value={billingAddress}
                onChange={handleBillingChange}
              />
            )}
            {needsAddress && sameAsShipping && (
              <p className="text-sm text-gray-500">Using shipping address</p>
            )}
          </div>

          {/* Delivery instructions */}
          <div>
            <label className={labelCls}>
              Delivery instructions{" "}
              <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={3}
              className={inputCls}
            />
          </div>

          {/* Price summary */}
          <div className="rounded-md bg-gray-50 p-4 text-sm space-y-1">
            <div className="flex justify-between text-gray-600">
              <span>Dress rental</span>
              <span>${dressPrice.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Delivery</span>
              <span>${deliveryFee.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-semibold text-gray-900 border-t pt-1 mt-1">
              <span>Total</span>
              <span>${totalDisplay}</span>
            </div>
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
              {isSubmitting ? "Creating…" : "Create booking"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
};

export default CreateBookingModal;
