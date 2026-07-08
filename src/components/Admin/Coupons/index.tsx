import React from "react";
import dayjs from "dayjs";
import {
  getCoupons,
  createCoupon,
  deleteCoupon,
  getAllAdminUsers,
} from "@/api/admin";
import { Coupon, UserType } from "../../../../common/types";
import Button from "@/components/Button";
import Spinner from "@/components/Spinner";
import Toast, { ToastType, ToastVariant } from "@/components/Toast";

const AdminCoupons = () => {
  const [coupons, setCoupons] = React.useState<Coupon[]>([]);
  const [users, setUsers] = React.useState<UserType[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [toast, setToast] = React.useState<ToastType>({
    message: "",
    variant: ToastVariant.WARNING,
    show: false,
  });

  const [userId, setUserId] = React.useState("");
  const [discountAmount, setDiscountAmount] = React.useState("");
  const [expiryHours, setExpiryHours] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const fetchCoupons = () => {
    setIsLoading(true);
    getCoupons()
      .then((res) => setCoupons(res.data as Coupon[]))
      .catch(() =>
        setToast({
          message: "Failed to load coupons",
          variant: ToastVariant.WARNING,
          show: true,
        }),
      )
      .finally(() => setIsLoading(false));
  };

  React.useEffect(() => {
    fetchCoupons();
    getAllAdminUsers()
      .then((res) => setUsers(res.data as UserType[]))
      .catch(() => {});
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!userId || !discountAmount || !expiryHours) return;

    const amount = Number(discountAmount);
    if (isNaN(amount) || amount <= 0) {
      setToast({
        message: "Discount amount must be a positive number",
        variant: ToastVariant.WARNING,
        show: true,
      });
      return;
    }

    const hours = Number(expiryHours);
    if (!Number.isInteger(hours) || hours <= 0) {
      setToast({
        message: "Expiry hours must be a positive whole number",
        variant: ToastVariant.WARNING,
        show: true,
      });
      return;
    }

    setIsSubmitting(true);
    createCoupon({ userId, discountAmount: amount, expiryHours: hours })
      .then(() => {
        setDiscountAmount("");
        setExpiryHours("");
        fetchCoupons();
      })
      .catch(() =>
        setToast({
          message: "Failed to add coupon",
          variant: ToastVariant.WARNING,
          show: true,
        }),
      )
      .finally(() => setIsSubmitting(false));
  };

  const handleDelete = (id: string) => {
    deleteCoupon(id)
      .then(() => setCoupons((prev) => prev.filter((c) => c._id !== id)))
      .catch(() =>
        setToast({
          message: "Failed to remove coupon",
          variant: ToastVariant.WARNING,
          show: true,
        }),
      );
  };

  const getUserLabel = (id: string) => {
    const u = users.find((u) => u._id === id);
    return u ? `${u.name} - ${u.email}` : id;
  };

  const getStatus = (c: Coupon): "Active" | "Expired" | "Redeemed" => {
    if (c.isRedeemed) return "Redeemed";
    if (c.expiryDate < dayjs().toISOString()) return "Expired";
    return "Active";
  };

  const statusClass = (status: string) =>
    status === "Active"
      ? "text-green-700 bg-green-50"
      : status === "Expired"
        ? "text-gray-500 bg-gray-100"
        : "text-blue-700 bg-blue-50";

  return (
    <>
      <Toast toast={toast} setToast={setToast} />
      <div className="p-4 sm:px-6 lg:px-8">
        <div className="sm:flex sm:items-center pb-4">
          <div className="sm:flex-auto">
            <h1 className="text-base font-semibold leading-6 text-gray-900">
              Coupons
            </h1>
            <p className="mt-2 text-sm text-gray-700">
              Assign a flat-dollar discount coupon to a customer.
            </p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 items-end"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Customer
            </label>
            <select
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 sm:text-sm sm:leading-6"
              required
            >
              <option value="">Select a customer…</option>
              {users.map((u) => (
                <option key={u._id ?? u.email} value={u._id ?? ""}>
                  {u.name} - {u.email}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Discount amount ($)
            </label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={discountAmount}
              onChange={(e) => setDiscountAmount(e.target.value)}
              className="block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 sm:text-sm sm:leading-6"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Expires in (hours)
            </label>
            <input
              type="number"
              min="1"
              step="1"
              value={expiryHours}
              onChange={(e) => setExpiryHours(e.target.value)}
              className="block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 sm:text-sm sm:leading-6"
              required
            />
          </div>

          <div>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Adding…" : "Add coupon"}
            </Button>
          </div>
        </form>

        {isLoading ? (
          <div className="flex justify-center">
            <Spinner />
          </div>
        ) : coupons.length === 0 ? (
          <p className="text-sm text-gray-500">No coupons issued.</p>
        ) : (
          <div className="flow-root">
            <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
              <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                <table className="min-w-full divide-y divide-gray-300">
                  <thead>
                    <tr>
                      <th
                        scope="col"
                        className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-0"
                      >
                        Customer
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                      >
                        Discount
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                      >
                        Expires
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                      >
                        Status
                      </th>
                      <th scope="col" className="px-3 py-3.5" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {coupons.map((c) => {
                      const status = getStatus(c);
                      return (
                        <tr key={c._id}>
                          <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-0">
                            {getUserLabel(c.userId)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            ${c.discountAmount.toFixed(2)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {dayjs(c.expiryDate).format("MMM D, YYYY h:mma")}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm">
                            <span
                              className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${statusClass(status)}`}
                            >
                              {status}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-right">
                            <button
                              onClick={() => handleDelete(c._id!)}
                              className="text-red-500 hover:text-red-700 text-xs font-medium"
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default AdminCoupons;
