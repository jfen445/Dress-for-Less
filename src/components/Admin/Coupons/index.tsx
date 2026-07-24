import React from "react";
import dayjs from "dayjs";
import {
  getCoupons,
  createCoupon,
  deleteCoupon,
  getAllAdminUsers,
} from "@/api/admin";
import { getCouponStatus } from "../../../../lib/utils/couponRules";
import { Coupon, UserType } from "../../../../common/types";
import { CouponType } from "../../../../common/enums/CouponType";
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
  const [isGlobal, setIsGlobal] = React.useState(false);
  const [maxRedemptions, setMaxRedemptions] = React.useState("");
  const [discountType, setDiscountType] = React.useState<CouponType>(
    CouponType.Flat,
  );
  const [discountAmount, setDiscountAmount] = React.useState("");
  const [startDate, setStartDate] = React.useState("");
  const [durationDays, setDurationDays] = React.useState("");
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

    if (!isGlobal && !userId) return;
    if (!discountAmount || !startDate || !durationDays) return;

    const amount = Number(discountAmount);
    if (isNaN(amount) || amount <= 0) {
      setToast({
        message: "Discount amount must be a positive number",
        variant: ToastVariant.WARNING,
        show: true,
      });
      return;
    }

    if (discountType === CouponType.Percentage && amount > 100) {
      setToast({
        message: "A percentage discount cannot exceed 100",
        variant: ToastVariant.WARNING,
        show: true,
      });
      return;
    }

    let redemptionLimit: number | undefined;
    if (isGlobal) {
      redemptionLimit = Number(maxRedemptions);
      if (!Number.isInteger(redemptionLimit) || redemptionLimit <= 0) {
        setToast({
          message: "Max redemptions must be a positive whole number",
          variant: ToastVariant.WARNING,
          show: true,
        });
        return;
      }
    }

    const days = Number(durationDays);
    if (!Number.isInteger(days) || days <= 0) {
      setToast({
        message: "Duration must be a positive whole number of days",
        variant: ToastVariant.WARNING,
        show: true,
      });
      return;
    }

    setIsSubmitting(true);
    createCoupon({
      userId: isGlobal ? undefined : userId,
      discountAmount: amount,
      discountType,
      isGlobal,
      maxRedemptions: redemptionLimit,
      startDate,
      durationDays: days,
    })
      .then(() => {
        setIsGlobal(false);
        setMaxRedemptions("");
        setDiscountType(CouponType.Flat);
        setDiscountAmount("");
        setStartDate("");
        setDurationDays("");
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

  const getUserLabel = (id?: string) => {
    const u = users.find((u) => u._id === id);
    return u ? `${u.name} - ${u.email}` : id;
  };

  const getCustomerLabel = (c: Coupon) =>
    c.isGlobal
      ? `Global — ${c.redeemedByUserIds?.length ?? 0}/${c.maxRedemptions ?? 0} redeemed`
      : getUserLabel(c.userId);

  const statusClass = (status: string) =>
    status === "Active"
      ? "text-green-700 bg-green-50"
      : status === "Expired"
        ? "text-gray-500 bg-gray-100"
        : status === "Scheduled"
          ? "text-amber-700 bg-amber-50"
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
              Assign a discount coupon to a customer.
            </p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6 items-end"
        >
          <div className="sm:col-span-2 lg:col-span-6">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <input
                type="checkbox"
                checked={isGlobal}
                onChange={(e) => {
                  setIsGlobal(e.target.checked);
                  if (e.target.checked) setUserId("");
                }}
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              Global coupon — available to every customer
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Customer
            </label>
            <select
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 sm:text-sm sm:leading-6 disabled:bg-gray-100 disabled:text-gray-400"
              required={!isGlobal}
              disabled={isGlobal}
            >
              <option value="">Select a customer…</option>
              {users.map((u) => (
                <option key={u._id ?? u.email} value={u._id ?? ""}>
                  {u.name} - {u.email}
                </option>
              ))}
            </select>
          </div>

          {isGlobal && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max redemptions
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={maxRedemptions}
                onChange={(e) => setMaxRedemptions(e.target.value)}
                className="block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 sm:text-sm sm:leading-6"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Discount type
            </label>
            <select
              value={discountType}
              onChange={(e) => setDiscountType(e.target.value as CouponType)}
              className="block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 sm:text-sm sm:leading-6"
              required
            >
              <option value={CouponType.Flat}>Flat ($)</option>
              <option value={CouponType.Percentage}>Percentage (%)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Discount amount ({discountType === CouponType.Percentage ? "%" : "$"})
            </label>
            <input
              type="number"
              min={discountType === CouponType.Percentage ? "1" : "0.01"}
              max={discountType === CouponType.Percentage ? "100" : undefined}
              step={discountType === CouponType.Percentage ? "1" : "0.01"}
              value={discountAmount}
              onChange={(e) => setDiscountAmount(e.target.value)}
              className="block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 sm:text-sm sm:leading-6"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 sm:text-sm sm:leading-6"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Duration (days)
            </label>
            <input
              type="number"
              min="1"
              step="1"
              value={durationDays}
              onChange={(e) => setDurationDays(e.target.value)}
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
                        Starts
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
                      const status = getCouponStatus(c);
                      return (
                        <tr key={c._id}>
                          <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-0">
                            {getCustomerLabel(c)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {c.discountType === CouponType.Percentage
                              ? `${c.discountAmount}%`
                              : `$${c.discountAmount.toFixed(2)}`}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {dayjs(c.startDate).format("MMM D, YYYY h:mma")}
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
                            <Button
                              variant="ghost"
                              onClick={() => handleDelete(c._id!)}
                              className="text-red-500 hover:text-red-700 text-xs font-medium"
                            >
                              Remove
                            </Button>
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
