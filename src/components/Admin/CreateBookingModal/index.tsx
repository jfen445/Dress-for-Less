import React from "react";
import Modal from "@/components/Modal";
import Button from "@/components/Button";
import Calendar from "@/components/ProductPage/Calendar";
import { useGlobalContext } from "@/context/GlobalContext";
import { getAllAdminUsers, createAdminBooking } from "@/api/admin";
import { DeliveryType } from "../../../../common/enums/DeliveryType";
import { UserType, Address, Sizes, DressType } from "../../../../common/types";
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

const getAvailableSizes = (dress?: DressType): string[] =>
  SIZES.filter((s) => {
    if (!dress) return false;
    const stock = parseInt(
      (dress[s.toLowerCase() as keyof DressType] as string) ?? "0",
    );
    return stock > 0;
  });

const getSizes = (dress?: DressType): Sizes =>
  dress
    ? { xs: dress.xs, s: dress.s, m: dress.m, l: dress.l, xl: dress.xl }
    : {};

type BookingLineItem = {
  id: string;
  dressId: string;
  size: string;
  dateBooked: string;
  notes: string;
};

const emptyLineItem = (id: string): BookingLineItem => ({
  id,
  dressId: "",
  size: "",
  dateBooked: "",
  notes: "",
});

const inputCls =
  "block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 sm:text-sm sm:leading-6";
const labelCls = "block text-sm font-medium text-gray-700 mb-1";

type EditableAddressField =
  | "address"
  | "apartment"
  | "suburb"
  | "city"
  | "postCode"
  | "company";

const AddressFields = ({
  value,
  onChange,
}: {
  value: Address;
  onChange: (field: EditableAddressField, val: string) => void;
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
      ] as { field: EditableAddressField; label: string; required: boolean }[]
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
  defaultDeliveryType?: DeliveryType;
}

const CreateBookingModal = ({
  isOpen,
  setOpen,
  onCreated,
  defaultDeliveryType = DeliveryType.Delivery,
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
  const itemIdCounter = React.useRef(0);
  const makeItemId = () => `item-${itemIdCounter.current++}`;
  const [items, setItems] = React.useState<BookingLineItem[]>([
    emptyLineItem(makeItemId()),
  ]);
  const [userId, setUserId] = React.useState("");
  const [newUserEmail, setNewUserEmail] = React.useState("");
  const [newUserFirstName, setNewUserFirstName] = React.useState("");
  const [newUserLastName, setNewUserLastName] = React.useState("");
  const [deliveryType, setDeliveryType] =
    React.useState<DeliveryType>(defaultDeliveryType);
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
    setDeliveryType(defaultDeliveryType);
  }, [isOpen, defaultDeliveryType]);

  // Default the first (still-untouched) line item to the first dress once the
  // catalogue loads, matching the old single-dress behaviour.
  React.useEffect(() => {
    if (sortedDresses.length === 0) return;
    setItems((prev) => {
      if (prev.length !== 1 || prev[0].dressId) return prev;
      const availableSizes = getAvailableSizes(sortedDresses[0]);
      return [
        { ...prev[0], dressId: sortedDresses[0]._id, size: availableSizes[0] ?? "" },
      ];
    });
  }, [sortedDresses]);

  const dressPrice = (dressId: string) => {
    const dress = sortedDresses.find((d) => d._id === dressId);
    return dress ? parseInt(dress.price) : 0;
  };

  const needsAddress = deliveryType !== DeliveryType.Pickup;
  const dressesTotal = items.reduce(
    (sum, item) => sum + dressPrice(item.dressId),
    0,
  );
  const deliveryFee = DELIVERY_FEES[deliveryType];
  const totalDisplay = (dressesTotal + deliveryFee).toFixed(2);

  const resetForm = () => {
    setCustomerMode("existing");
    setItems([emptyLineItem(makeItemId())]);
    setUserId("");
    setNewUserEmail("");
    setNewUserFirstName("");
    setNewUserLastName("");
    setDeliveryType(defaultDeliveryType);
    setAddress(emptyAddress());
    setBillingAddress(emptyAddress());
    setInstructions("");
    setSameAsShipping(true);
  };

  const updateItem = (id: string, patch: Partial<BookingLineItem>) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  };

  const handleDressChange = (id: string, dressId: string) => {
    const dress = sortedDresses.find((d) => d._id === dressId);
    const availableSizes = getAvailableSizes(dress);
    updateItem(id, { dressId, size: availableSizes[0] ?? "", dateBooked: "" });
  };

  const handleSizeChange = (id: string, size: string) => {
    updateItem(id, { size, dateBooked: "" });
  };

  const addItem = () => {
    const dress = sortedDresses[0];
    const availableSizes = getAvailableSizes(dress);
    setItems((prev) => [
      ...prev,
      {
        id: makeItemId(),
        dressId: dress?._id ?? "",
        size: availableSizes[0] ?? "",
        dateBooked: "",
        notes: "",
      },
    ]);
  };

  const removeItem = (id: string) => {
    setItems((prev) => (prev.length > 1 ? prev.filter((i) => i.id !== id) : prev));
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
    const itemsInvalid = items.some(
      (item) => !item.dressId || !item.size || !item.dateBooked,
    );
    if (itemsInvalid || customerInvalid) {
      setToast({
        message: "Please fill in all required fields including a date for each dress",
        variant: ToastVariant.WARNING,
        show: true,
      });
      return;
    }
    setIsSubmitting(true);
    try {
      await createAdminBooking({
        items: items.map(({ dressId, size, dateBooked, notes }) => ({
          dressId,
          size,
          dateBooked,
          notes,
        })),
        ...(customerMode === "existing"
          ? { userId }
          : {
              newUser: {
                email: newUserEmail,
                firstName: newUserFirstName,
                lastName: newUserLastName,
              },
            }),
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
          <div className="space-y-4">
            {items.map((item, idx) => {
              const dress = sortedDresses.find((d) => d._id === item.dressId);
              const availableSizes = getAvailableSizes(dress);
              const sizes = getSizes(dress);

              return (
                <div
                  key={item.id}
                  className="rounded-md border border-gray-200 p-4 space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-800">
                      Dress {idx + 1}
                    </span>
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="text-sm text-red-600 hover:underline"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className={labelCls}>Dress</label>
                      <select
                        value={item.dressId}
                        onChange={(e) =>
                          handleDressChange(item.id, e.target.value)
                        }
                        className={inputCls}
                        required
                      >
                        <option value="">Select a dress…</option>
                        {sortedDresses.map((d) => (
                          <option key={d._id} value={d._id}>
                            {d.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className={labelCls}>Size</label>
                      <select
                        value={item.size}
                        onChange={(e) =>
                          handleSizeChange(item.id, e.target.value)
                        }
                        className={inputCls}
                        required
                        disabled={!item.dressId}
                      >
                        <option value="">Select a size…</option>
                        {availableSizes.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {item.dressId && item.size && (
                    <div>
                      <label className={`${labelCls} mb-0`}>Rental date</label>
                      <Calendar
                        setSelectedDate={(date) =>
                          updateItem(item.id, {
                            dateBooked:
                              typeof date === "function"
                                ? (date as (prev: string) => string)(
                                    item.dateBooked,
                                  )
                                : date,
                          })
                        }
                        sizes={sizes}
                        selectedSize={item.size}
                        dressId={item.dressId}
                        isAdmin={true}
                        deliveryType={deliveryType}
                      />
                      {item.dateBooked && (
                        <p className="text-sm text-gray-500 mt-1">
                          Selected:{" "}
                          {new Date(item.dateBooked).toLocaleDateString(
                            "en-NZ",
                            {
                              weekday: "long",
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                            },
                          )}
                        </p>
                      )}
                    </div>
                  )}

                  <div>
                    <label className={labelCls}>
                      Notes{" "}
                      <span className="text-gray-400 font-normal">
                        (optional)
                      </span>
                    </label>
                    <textarea
                      value={item.notes}
                      onChange={(e) =>
                        updateItem(item.id, { notes: e.target.value })
                      }
                      rows={2}
                      className={inputCls}
                    />
                  </div>
                </div>
              );
            })}

            <Button
              type="button"
              variant="ghost"
              onClick={addItem}
              className="text-sm text-primary-pink hover:underline px-0 py-0"
            >
              + Add another dress
            </Button>
          </div>

          {/* Customer */}
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
            {items.map((item) => {
              const dress = sortedDresses.find((d) => d._id === item.dressId);
              if (!dress) return null;
              return (
                <div key={item.id} className="flex justify-between text-gray-600">
                  <span>{dress.name}</span>
                  <span>${dressPrice(item.dressId).toFixed(2)}</span>
                </div>
              );
            })}
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
