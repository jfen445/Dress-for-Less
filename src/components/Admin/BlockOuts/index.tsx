import React from "react";
import dayjs from "dayjs";
import { useGlobalContext } from "@/context/GlobalContext";
import { getBlockOuts, createBlockOut, deleteBlockOut } from "@/api/admin";
import { BlockOut } from "../../../../common/types";
import Button from "@/components/Button";
import Spinner from "@/components/Spinner";
import Toast, { ToastType } from "@/components/Toast";

const SIZES = ["XS", "S", "M", "L", "XL"];

const AdminBlockOuts = () => {
  const { allDresses } = useGlobalContext();
  const [blockOuts, setBlockOuts] = React.useState<BlockOut[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [toast, setToast] = React.useState<ToastType>({ message: "", variant: "warning", show: false });

  const [dressId, setDressId] = React.useState("");
  const [size, setSize] = React.useState(SIZES[0]);
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");
  const [reason, setReason] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const fetchBlockOuts = () => {
    setIsLoading(true);
    getBlockOuts()
      .then((res) => setBlockOuts(res.data as BlockOut[]))
      .catch(() => setToast({ message: "Failed to load block outs", variant: "warning", show: true }))
      .finally(() => setIsLoading(false));
  };

  React.useEffect(() => {
    fetchBlockOuts();
  }, []);

  React.useEffect(() => {
    if (allDresses && allDresses.length > 0 && !dressId) {
      setDressId(allDresses[0]._id);
    }
  }, [allDresses, dressId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dressId || !size || !startDate || !endDate) return;
    if (startDate > endDate) {
      setToast({ message: "Start date must be on or before end date", variant: "warning", show: true });
      return;
    }
    setIsSubmitting(true);
    createBlockOut({ dressId, size, startDate, endDate, reason: reason || undefined })
      .then(() => { setReason(""); fetchBlockOuts(); })
      .catch(() => setToast({ message: "Failed to add block out", variant: "warning", show: true }))
      .finally(() => setIsSubmitting(false));
  };

  const handleDelete = (id: string) => {
    deleteBlockOut(id)
      .then(() => setBlockOuts((prev) => prev.filter((b) => b._id !== id)))
      .catch(() => setToast({ message: "Failed to remove block out", variant: "warning", show: true }));
  };

  const selectedDress = allDresses?.find((d) => d._id === dressId);
  const getDressName = (id: string) => allDresses?.find((d) => d._id === id)?.name ?? id;

  return (
    <>
      <Toast toast={toast} setToast={setToast} />
      <div className="p-4 sm:px-6 lg:px-8">
        <div className="sm:flex sm:items-center pb-4">
          <div className="sm:flex-auto">
            <h1 className="text-base font-semibold leading-6 text-gray-900">Block Outs</h1>
            <p className="mt-2 text-sm text-gray-700">Block a dress size from being booked during a date range.</p>
          </div>
        </div>

        {/* Create form */}
        <form onSubmit={handleSubmit} className="mb-8 flex gap-6 items-start">
          {selectedDress && (
            <div className="hidden sm:block flex-shrink-0">
              <img
                src={selectedDress.images[0]}
                alt={selectedDress.name}
                className="h-40 w-40 rounded-lg object-cover"
              />
              <p className="mt-2 text-xs text-gray-500 text-center truncate w-40">{selectedDress.name}</p>
            </div>
          )}

          <div className="flex-1 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dress</label>
              <select
                value={dressId}
                onChange={(e) => setDressId(e.target.value)}
                className="block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 sm:text-sm sm:leading-6"
                required
              >
                {allDresses?.map((d) => (
                  <option key={d._id} value={d._id}>{d.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Size</label>
              <select
                value={size}
                onChange={(e) => setSize(e.target.value)}
                className="block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 sm:text-sm sm:leading-6"
                required
              >
                {SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 sm:text-sm sm:leading-6"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 sm:text-sm sm:leading-6"
                required
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Reason (optional)</label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Under repair"
                className="block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 sm:text-sm sm:leading-6"
              />
            </div>

            <div className="flex items-end">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Adding…" : "Add block out"}
              </Button>
            </div>
          </div>
        </form>

        {/* List */}
        {isLoading ? (
          <div className="flex justify-center">
            <Spinner />
          </div>
        ) : blockOuts.length === 0 ? (
          <p className="text-sm text-gray-500">No block outs set.</p>
        ) : (
          <div className="flow-root">
            <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
              <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                <table className="min-w-full divide-y divide-gray-300">
                  <thead>
                    <tr>
                      <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-0">Dress</th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Size</th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Start</th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">End</th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Reason</th>
                      <th className="px-3 py-3.5" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {blockOuts.map((b) => (
                      <tr key={b._id}>
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-0">
                          {getDressName(b.dressId)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{b.size}</td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {dayjs(b.startDate).format("MMM D, YYYY")}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {dayjs(b.endDate).format("MMM D, YYYY")}
                        </td>
                        <td className="px-3 py-4 text-sm text-gray-500">{b.reason ?? "—"}</td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-right">
                          <button
                            onClick={() => handleDelete(b._id!)}
                            className="text-red-500 hover:text-red-700 text-xs font-medium"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
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

export default AdminBlockOuts;
