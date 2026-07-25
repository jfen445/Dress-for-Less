import React from "react";
import Spinner from "@/components/Spinner";
import Input from "@/components/Input";
import { useGlobalContext } from "@/context/GlobalContext";
import { useAdminBooking } from "@/context/AdminBookingContext";
import { getStatusColour } from "../../../../lib/utils/bookingStatusColors";
import Pagination from "../../DressPage/DressGrid/Pagination";
import BookingHistoryModal from "../BookingHistoryModal";
import { BookingLineItem, DressType } from "../../../../common/types";

const PAGE_SIZE = 32;

const AdminDresses = () => {
  const { allDresses } = useGlobalContext();
  const {
    dressStatuses: statusesByDress,
    fetchDressStatuses,
    bookings,
    thisWeekBookings,
    pastBookings,
  } = useAdminBooking();
  const [currentPage, setCurrentPage] = React.useState(1);
  const [searchQuery, setSearchQuery] = React.useState("");
  const gridTopRef = React.useRef<HTMLDivElement>(null);
  const [historyModalOpen, setHistoryModalOpen] = React.useState(false);
  const [historyTarget, setHistoryTarget] = React.useState<{
    title: string;
    subtitle?: string;
    image?: string;
    lineItems: BookingLineItem[];
  } | null>(null);

  const allBookingsHistory = React.useMemo(
    () => [...thisWeekBookings, ...bookings, ...pastBookings],
    [thisWeekBookings, bookings, pastBookings],
  );

  const sortedDresses = React.useMemo(() => {
    const isActive = (dressId: string) =>
      (statusesByDress[dressId]?.length ?? 0) > 0;

    return [...(allDresses ?? [])].sort((a, b) => {
      const aActive = isActive(a._id);
      const bActive = isActive(b._id);
      if (aActive !== bActive) return aActive ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }, [allDresses, statusesByDress]);

  const filteredDresses = React.useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return sortedDresses;
    return sortedDresses.filter(
      (dress) =>
        dress.name.toLowerCase().includes(query) ||
        dress.brand.toLowerCase().includes(query),
    );
  }, [sortedDresses, searchQuery]);

  React.useEffect(() => {
    fetchDressStatuses();
  }, [fetchDressStatuses]);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [filteredDresses]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    gridTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const totalPages = React.useMemo(
    () => Math.max(1, Math.ceil(filteredDresses.length / PAGE_SIZE)),
    [filteredDresses],
  );

  const paginatedDresses = React.useMemo(
    () =>
      filteredDresses.slice(
        (currentPage - 1) * PAGE_SIZE,
        currentPage * PAGE_SIZE,
      ),
    [filteredDresses, currentPage],
  );

  const openDressHistory = (dress: DressType) => {
    const lineItems: BookingLineItem[] = [];
    for (const booking of allBookingsHistory) {
      for (const item of booking.items) {
        if (item.dressId === dress._id) lineItems.push({ booking, item });
      }
    }
    setHistoryTarget({
      title: dress.name,
      subtitle: dress.brand,
      image: dress.images?.[0],
      lineItems,
    });
    setHistoryModalOpen(true);
  };

  return (
    <>
      <BookingHistoryModal
        isOpen={historyModalOpen}
        setOpen={setHistoryModalOpen}
        title={historyTarget?.title ?? ""}
        subtitle={historyTarget?.subtitle}
        image={historyTarget?.image}
        lineItems={historyTarget?.lineItems ?? []}
      />
      <div className="p-4 sm:px-6 lg:px-8">
        <div className="sm:flex sm:items-center pb-4">
          <div className="sm:flex-auto">
            <h1 className="text-base font-semibold leading-6 text-gray-900">
              Dresses
            </h1>
            <p className="mt-2 text-sm text-gray-700">
              A list of all the dresses
            </p>
          </div>
          <div className="mt-4 sm:ml-16 sm:mt-0 sm:w-64">
            <Input
              type="text"
              name="dress-search"
              id="dress-search"
              placeholder="Search by name or brand…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        {allDresses && allDresses.length > 0 ? (
          filteredDresses.length > 0 ? (
            <>
              <div ref={gridTopRef} />
              <ul
                role="list"
                className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
              >
                {paginatedDresses.map((dress) => {
                  const activeBookings = statusesByDress[dress._id] ?? [];
                  const [primary, ...rest] = activeBookings;

                  return (
                    <li
                      key={dress._id}
                      className="col-span-1 flex flex-col divide-y divide-gray-200 rounded-lg bg-white text-center shadow cursor-pointer"
                      onClick={() => openDressHistory(dress)}
                    >
                      <div className="flex flex-1 flex-col p-8">
                        <img
                          alt=""
                          src={dress.images[0]}
                          className="mx-auto h-32 w-32 flex-shrink-0 rounded-full"
                        />
                        <h3 className="mt-6 text-sm font-medium text-gray-900">
                          {dress.name}
                        </h3>
                        <dl className="mt-1 flex flex-grow flex-col justify-between">
                          <dd className="mt-3 space-x-2">
                            {primary ? (
                              <>
                                <span
                                  className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ring-1 ring-inset ${getStatusColour(primary.status)}`}
                                >
                                  {primary.status}
                                </span>
                                {rest.length > 0 && (
                                  <span className="text-xs text-gray-400">
                                    +{rest.length} more
                                  </span>
                                )}
                              </>
                            ) : (
                              <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/20">
                                Available
                              </span>
                            )}
                          </dd>
                        </dl>
                      </div>
                    </li>
                  );
                })}
              </ul>
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
            </>
          ) : (
            <p className="text-sm text-gray-500">
              No dresses match &quot;{searchQuery}&quot;.
            </p>
          )
        ) : (
          <div className="flex justify-center">
            <Spinner />
          </div>
        )}
      </div>
    </>
  );
};

export default AdminDresses;
