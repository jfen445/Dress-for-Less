import { getAllBookings } from "@/api/admin";
import dayjs from "dayjs";
import React, { Fragment } from "react";
import { Booking, UserType } from "../../../../common/types";
import Button from "@/components/Button";
import Spinner from "@/components/Spinner";
import UserModal from "../UserModal";
import CreateBookingModal from "../CreateBookingModal";
import DeleteBookingModal from "../DeleteBookingModal";
import EditBookingModal from "../EditBookingModal";
import EmailBookingsModal from "../EmailBookingsModal";
import DownloadBookingsModal from "../DownloadBookingsModal";
import BookingHistoryModal from "../BookingHistoryModal";
import {
  MagnifyingGlassIcon,
  PencilSquareIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { updateBooking } from "@/api/booking";
import { BookingStatus } from "../../../../common/enums/BookingStatus";
import Toast, { ToastType, ToastVariant } from "@/components/Toast";
import { useAdminBooking } from "@/context/AdminBookingContext";
import { DeliveryType } from "../../../../common/enums/DeliveryType";
import AdminBookingsCalendar from "@/components/Admin/BookingsCalendar";

type AdminBookingsProps = {
  deliveryType: DeliveryType[];
};

const AdminBookings = ({ deliveryType }: AdminBookingsProps) => {
  const {
    bookings,
    thisWeekBookings,
    pastBookings,
    isLoading,
    getBookings,
    updateBookingStatus,
    removeBooking,
  } = useAdminBooking();
  const [isError, setIsError] = React.useState<boolean>(false);
  const [toast, setToast] = React.useState<ToastType>({
    message: "",
    variant: ToastVariant.WARNING,
    show: false,
  });
  const [selectedUser, setSelectedUser] = React.useState<UserType | null>(null);
  const [userModalOpen, setUserModalOpen] = React.useState<boolean>(false);
  const [createModalOpen, setCreateModalOpen] = React.useState<boolean>(false);
  const [emailModalOpen, setEmailModalOpen] = React.useState<boolean>(false);
  const [downloadModalOpen, setDownloadModalOpen] =
    React.useState<boolean>(false);
  const [deleteModalOpen, setDeleteModalOpen] = React.useState<boolean>(false);
  const [bookingToDelete, setBookingToDelete] = React.useState<Booking | null>(
    null,
  );
  const [editModalOpen, setEditModalOpen] = React.useState<boolean>(false);
  const [bookingToEdit, setBookingToEdit] = React.useState<Booking | null>(
    null,
  );

  const [searchQuery, setSearchQuery] = React.useState<string>("");
  const [isSearchOpen, setIsSearchOpen] = React.useState<boolean>(false);
  const searchContainerRef = React.useRef<HTMLDivElement>(null);
  const [historyModalOpen, setHistoryModalOpen] =
    React.useState<boolean>(false);
  const [historyTarget, setHistoryTarget] = React.useState<{
    title: string;
    subtitle?: string;
    image?: string;
    bookings: Booking[];
  } | null>(null);

  const [showThisWeek, setShowThisWeek] = React.useState<boolean>(true);
  const [showPrevious, setShowPrevious] = React.useState<boolean>(true);
  const [showUpcoming, setShowUpcoming] = React.useState<boolean>(true);

  const [expandedBookingId, setExpandedBookingId] = React.useState<
    string | null
  >(null);
  const [selectedStatuses, setSelectedStatuses] = React.useState<
    BookingStatus[]
  >(Object.values(BookingStatus));

  const [enlargedImage, setEnlargedImage] = React.useState<{
    src: string;
    alt: string;
  } | null>(null);
  const [isEnlargedImageVisible, setIsEnlargedImageVisible] =
    React.useState<boolean>(false);

  const openEnlargedImage = (src?: string, alt?: string) => {
    if (!src) return;
    setEnlargedImage({ src, alt: alt ?? "" });
  };

  const closeEnlargedImage = () => {
    setIsEnlargedImageVisible(false);
    setTimeout(() => setEnlargedImage(null), 200);
  };

  React.useEffect(() => {
    if (!enlargedImage) return;
    const frame = requestAnimationFrame(() => setIsEnlargedImageVisible(true));
    return () => cancelAnimationFrame(frame);
  }, [enlargedImage]);

  React.useEffect(() => {
    if (!enlargedImage) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeEnlargedImage();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [enlargedImage]);

  const toggleRow = (id: string) => {
    setExpandedBookingId(expandedBookingId === id ? null : id);
  };

  const toggleStatus = (status: BookingStatus) => {
    setSelectedStatuses((prev) =>
      prev.includes(status)
        ? prev.filter((s) => s !== status)
        : [...prev, status],
    );
  };

  const closeSearch = React.useCallback(() => {
    setIsSearchOpen(false);
    setSearchQuery("");
  }, []);

  React.useEffect(() => {
    if (!isSearchOpen) return;
    const handler = (e: MouseEvent) => {
      if (!searchContainerRef.current?.contains(e.target as Node)) {
        closeSearch();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isSearchOpen, closeSearch]);

  const allBookingsHistory = React.useMemo(
    () => [...thisWeekBookings, ...bookings, ...pastBookings],
    [thisWeekBookings, bookings, pastBookings],
  );

  const dressSearchResults = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    const seen = new Set<string>();
    const results: { dressId: string; name: string; brand: string; image?: string }[] =
      [];
    for (const booking of allBookingsHistory) {
      const dressId = booking.dressId;
      const dress = booking.dress;
      if (!dress || seen.has(dressId)) continue;
      if (
        dress.name?.toLowerCase().includes(q) ||
        dress.brand?.toLowerCase().includes(q)
      ) {
        seen.add(dressId);
        results.push({
          dressId,
          name: dress.name,
          brand: dress.brand,
          image: dress.images?.[0],
        });
      }
    }
    return results.slice(0, 8);
  }, [allBookingsHistory, searchQuery]);

  const userSearchResults = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    const seen = new Set<string>();
    const results: { userId: string; name?: string; email?: string }[] = [];
    for (const booking of allBookingsHistory) {
      const user = (booking as any).user?.[0];
      const userId = booking.userId;
      if (!user || seen.has(userId)) continue;
      if (
        user.name?.toLowerCase().includes(q) ||
        user.email?.toLowerCase().includes(q)
      ) {
        seen.add(userId);
        results.push({ userId, name: user.name, email: user.email });
      }
    }
    return results.slice(0, 8);
  }, [allBookingsHistory, searchQuery]);

  const openDressHistory = (dressId: string, name: string, brand?: string, image?: string) => {
    const dressBookings = allBookingsHistory.filter(
      (b) => b.dressId === dressId,
    );
    setHistoryTarget({
      title: name,
      subtitle: brand,
      image,
      bookings: dressBookings,
    });
    setHistoryModalOpen(true);
    closeSearch();
  };

  const openUserHistory = (userId: string, name?: string, email?: string) => {
    const userBookings = allBookingsHistory.filter((b) => b.userId === userId);
    setHistoryTarget({
      title: name || email || "User",
      subtitle: name ? email : undefined,
      bookings: userBookings,
    });
    setHistoryModalOpen(true);
    closeSearch();
  };

  const filteredBookings = React.useMemo(() => {
    let result = bookings;
    if (deliveryType?.length)
      result = result.filter((b) =>
        deliveryType.includes(b.deliveryType as DeliveryType),
      );
    if (selectedStatuses.length)
      result = result.filter((b) =>
        selectedStatuses.includes(b.status as BookingStatus),
      );
    return result;
  }, [bookings, deliveryType, selectedStatuses]);

  const filteredThisWeekBookings = React.useMemo(() => {
    let result = thisWeekBookings;
    if (deliveryType?.length)
      result = result.filter((b) =>
        deliveryType.includes(b.deliveryType as DeliveryType),
      );
    if (selectedStatuses.length)
      result = result.filter((b) =>
        selectedStatuses.includes(b.status as BookingStatus),
      );
    return result;
  }, [thisWeekBookings, deliveryType, selectedStatuses]);

  const filteredPastBookings = React.useMemo(() => {
    let result = pastBookings;
    if (deliveryType?.length)
      result = result.filter((b) =>
        deliveryType.includes(b.deliveryType as DeliveryType),
      );
    if (selectedStatuses.length)
      result = result.filter((b) =>
        selectedStatuses.includes(b.status as BookingStatus),
      );
    return result;
  }, [pastBookings, deliveryType, selectedStatuses]);

  const updateCurrentBooking = async (
    bookingId: string,
    bookingStatus: BookingStatus,
  ) => {
    await updateBooking(bookingId, { status: bookingStatus })
      .then(() => updateBookingStatus(bookingId, bookingStatus))
      .catch(() =>
        setToast({
          message: "An error occurred while updating booking status",
          variant: ToastVariant.WARNING,
          show: true,
        }),
      );
  };

  type ObjectArray = Record<string, any>[];

  const convertToCSV = (objArray: ObjectArray): string => {
    const array =
      typeof objArray !== "object" ? JSON.parse(objArray) : objArray;

    // Helper function to flatten the object
    function flattenObject(ob: Record<string, any>): Record<string, any> {
      const toReturn: Record<string, any> = {};

      for (const i in ob) {
        if (!ob.hasOwnProperty(i)) continue;

        if (typeof ob[i] === "object" && ob[i] !== null) {
          const flatObject = flattenObject(ob[i]);
          for (const x in flatObject) {
            if (!flatObject.hasOwnProperty(x)) continue;
            toReturn[`${i}.${x}`] = flatObject[x];
          }
        } else {
          toReturn[i] = ob[i];
        }
      }
      return toReturn;
    }

    // Extract keys (headers) and rows (values)
    const headers = Object.keys(flattenObject(array[0]));
    const csv = [
      headers.join(","), // Header row
      ...array.map((item: Record<string, any>) => {
        const flatItem = flattenObject(item);
        return headers.map((header) => `"${flatItem[header] || ""}"`).join(",");
      }),
    ].join("\r\n");

    return csv;
  };

  const downloadCSV = (csv: string, filename: string): void => {
    const csvFile = new Blob([csv], { type: "text/csv" });
    const downloadLink = document.createElement("a");

    downloadLink.download = filename;
    downloadLink.href = window.URL.createObjectURL(csvFile);
    downloadLink.style.display = "none";
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };

  const getCarrierProductCode = (city?: string): string =>
    city?.trim().toLowerCase() === "auckland" ? "CPOLP" : "CPOLTPA4";

  const extractObj = (bookingsToExport: Booking[]) => {
    return bookingsToExport?.map((booking) => ({
      Name: booking.user ? booking?.user[0].name : "",
      Email: booking.user ? booking?.user[0].email : "",
      Company: booking.address?.company ?? "",
      Building: booking.address?.apartment ?? "",
      Street: booking.address?.address ?? "",
      Suburb: booking.address?.suburb ?? "",
      City: booking.address?.city ?? "",
      Postcode: booking.address?.postCode ?? "",
      Country: booking.address?.country ?? "",
      Instructions: booking.instructions ?? "",
      CarrierProductCode: getCarrierProductCode(booking.address?.city),
    }));
  };

  const Dropdown = ({
    bookingId,
    initialStatus,
  }: {
    bookingId: string;
    initialStatus: BookingStatus;
  }) => {
    const [status, setStatus] = React.useState<BookingStatus>(
      initialStatus ?? BookingStatus.NA,
    );

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newStatus = e.target.value as BookingStatus;
      setStatus(newStatus);
      updateCurrentBooking(bookingId, newStatus);
    };
    return (
      <div>
        {/* <label
          htmlFor="location"
          className="block text-sm font-medium leading-6 text-gray-900 mt-4"
        >
          Select a status
        </label> */}
        <select
          id="status"
          name="status"
          value={status}
          onChange={handleChange}
          onClick={(e) => e.stopPropagation()}
          className={`mt-2 block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 sm:text-sm sm:leading-6 ${getStatusColour(status)}`}
        >
          {Object.values(BookingStatus).map((status) => (
            <option key={status} value={status} style={getStatusOptionStyle(status)}>
              {status}
            </option>
          ))}
        </select>
      </div>
    );
  };

  const getStatusOptionStyle = (
    status: BookingStatus,
  ): React.CSSProperties => {
    switch (status) {
      case BookingStatus.BeingReturned:
        return { backgroundColor: "#e9d5ff", color: "#581c87" };
      case BookingStatus.Washing:
        return { backgroundColor: "#bfdbfe", color: "#1e3a8a" };
      case BookingStatus.Drying:
        return { backgroundColor: "#d9f99d", color: "#365314" };
      case BookingStatus.Packed:
        return { backgroundColor: "#86efac", color: "#052e16" };
      case BookingStatus.Delayed:
        return { backgroundColor: "#fecaca", color: "#7f1d1d" };
      case BookingStatus.Reparing:
        return { backgroundColor: "#e7e5e4", color: "#1c1917" };
      case BookingStatus.Returned:
        return { backgroundColor: "#99f6e4", color: "#134e4a" };
      case BookingStatus.NA:
      default:
        return { backgroundColor: "#e5e7eb", color: "#111827" };
    }
  };

  const getStatusBgColour = (status: BookingStatus) => {
    switch (status) {
      case BookingStatus.BeingReturned:
        return "bg-purple-100";
      case BookingStatus.Washing:
        return "bg-blue-100";
      case BookingStatus.Drying:
        return "bg-lime-100";
      case BookingStatus.Packed:
        return "bg-green-200";
      case BookingStatus.Delayed:
        return "bg-red-100";
      case BookingStatus.Reparing:
        return "bg-stone-100";
      case BookingStatus.Returned:
        return "bg-teal-100";
      case BookingStatus.NA:
      default:
        return "bg-gray-100";
    }
  };

  const getStatusColour = (status: BookingStatus) => {
    let colour = "";
    switch (status) {
      case BookingStatus.BeingReturned:
        colour = "bg-purple-200 text-purple-900 ring-purple-700/30";
        break;
      case BookingStatus.Washing:
        colour = "bg-blue-200 text-blue-900 ring-blue-700/30";
        break;
      case BookingStatus.Drying:
        colour = "bg-lime-200 text-lime-900 ring-lime-700/30";
        break;
      case BookingStatus.Packed:
        colour = "bg-green-300 text-green-950 ring-green-800/40";
        break;
      case BookingStatus.Delayed:
        colour = "bg-red-200 text-red-900 ring-red-700/30";
        break;
      case BookingStatus.Reparing:
        colour = "bg-stone-200 text-stone-900 ring-stone-700/30";
        break;
      case BookingStatus.Returned:
        colour = "bg-teal-200 text-teal-900 ring-teal-700/30";
        break;
      case BookingStatus.NA:
        colour = "bg-gray-200 text-gray-900 ring-gray-700/30";
        break;
    }
    return colour;
  };

  const renderBookingRow = (bookingList: Booking[]) => {
    return (
      <>
        {bookingList?.map((currentBooking: any) => (
          <Fragment key={currentBooking._id}>
            {/* Main row */}
            <tr
              className={`cursor-pointer ${getStatusBgColour(currentBooking.status)}`}
              onClick={() => toggleRow(currentBooking._id)}
            >
              <td className="whitespace-nowrap py-5 pl-4 pr-3 text-sm sm:pl-0">
                <div className="flex items-center">
                  <img
                    src={currentBooking.dress?.images[0]}
                    alt={currentBooking.dress?.name ?? ""}
                    className="h-11 w-11 rounded-full cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      setUserModalOpen(true);
                      setSelectedUser(currentBooking.user?.[0]);
                    }}
                  />
                  <div className="ml-4">
                    <div>{currentBooking.dress?.name}</div>
                    <div className="text-gray-500">
                      {currentBooking.dress?.brand}
                    </div>
                  </div>
                </div>
              </td>

              <td className="px-3 py-5 text-sm">
                <div className="font-medium">
                  {currentBooking.user[0]?.name}
                </div>
                <div className="text-gray-500">
                  {currentBooking.user[0]?.email}
                </div>
              </td>

              <td className="px-3 py-5 text-sm text-gray-500">
                {dayjs(currentBooking.dateBooked).format("MMMM D, YYYY")}
              </td>

              <td className="px-3 py-5 text-sm text-gray-500">
                {currentBooking.size}
              </td>

              <td className="px-3 py-5 text-sm">
                {/* <span
                  className={`inline-flex rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${getStatusColour(
                    currentBooking,
                  )}`}
                >
                  {currentBooking.status}
                </span> */}
                <Dropdown
                  bookingId={currentBooking._id}
                  initialStatus={currentBooking.status}
                />
              </td>

              <td className="px-3 py-5 text-right text-sm font-medium">
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    title="Edit booking"
                    onClick={(e) => {
                      e.stopPropagation();
                      setBookingToEdit(currentBooking);
                      setEditModalOpen(true);
                    }}
                    className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                  >
                    <PencilSquareIcon className="h-5 w-5" />
                    <span className="sr-only">Edit</span>
                  </button>
                  <button
                    type="button"
                    title="Delete booking"
                    onClick={(e) => {
                      e.stopPropagation();
                      setBookingToDelete(currentBooking);
                      setDeleteModalOpen(true);
                    }}
                    className="rounded-md p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-600"
                  >
                    <TrashIcon className="h-5 w-5" />
                    <span className="sr-only">Delete</span>
                  </button>
                </div>
              </td>
            </tr>

            {/* EXPANDED CONTENT ROW */}
            {expandedBookingId === currentBooking._id && (
              <tr>
                <td colSpan={7} className="bg-gray-50 p-6">
                  {/* ----- Put your SlideOver content here ----- */}

                  <div className="flex space-x-6">
                    <img
                      src={currentBooking.dress?.images[0]}
                      alt={currentBooking.dress?.name ?? ""}
                      className="h-40 w-40 rounded-lg object-cover cursor-zoom-in transition-transform hover:scale-105"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEnlargedImage(
                          currentBooking.dress?.images[0],
                          currentBooking.dress?.name,
                        );
                      }}
                    />

                    <div className="space-y-4 flex-1">
                      <h3 className="font-semibold text-gray-900">
                        {currentBooking.dress?.name}
                      </h3>

                      <p className="text-sm">{currentBooking.dress?.brand}</p>

                      <p>
                        <span className="font-medium">Booked by:</span>{" "}
                        {currentBooking.user?.[0]?.name}
                      </p>

                      <p>
                        <span className="font-medium">Delivery:</span>{" "}
                        {currentBooking.deliveryType}
                      </p>

                      <p>
                        <span className="font-medium">Address:</span>{" "}
                        {currentBooking.address.apartment
                          ? `${currentBooking.address.apartment}/${currentBooking.address.address}`
                          : currentBooking.address.address}
                        {", "}
                        {currentBooking.address.city},{" "}
                        {currentBooking.address.country},{" "}
                        {currentBooking.address.postCode}
                      </p>
                    </div>
                  </div>
                </td>
              </tr>
            )}
          </Fragment>
        ))}
      </>
    );
  };

  return (
    <>
      {enlargedImage && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 transition-opacity duration-200 ease-out ${
            isEnlargedImageVisible ? "opacity-100" : "opacity-0"
          }`}
          onClick={closeEnlargedImage}
        >
          <img
            src={enlargedImage.src}
            alt={enlargedImage.alt}
            className={`max-h-[85vh] max-w-[90vw] rounded-lg object-contain shadow-2xl transition-all duration-200 ease-out ${
              isEnlargedImageVisible
                ? "scale-100 opacity-100"
                : "scale-90 opacity-0"
            }`}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
      <Toast toast={toast} setToast={setToast} />
      <UserModal
        isOpen={userModalOpen}
        setOpen={setUserModalOpen}
        user={selectedUser}
      ></UserModal>
      <CreateBookingModal
        isOpen={createModalOpen}
        setOpen={setCreateModalOpen}
        onCreated={() => {
          getBookings();
          setToast({
            message: "Booking created successfully",
            variant: ToastVariant.SUCCESS,
            show: true,
          });
        }}
      />
      <EmailBookingsModal
        isOpen={emailModalOpen}
        setOpen={setEmailModalOpen}
        bookings={filteredThisWeekBookings}
        onSent={(message) =>
          setToast({ message, variant: ToastVariant.SUCCESS, show: true })
        }
        onError={(message) =>
          setToast({ message, variant: ToastVariant.WARNING, show: true })
        }
      />
      <DownloadBookingsModal
        isOpen={downloadModalOpen}
        setOpen={setDownloadModalOpen}
        bookings={filteredThisWeekBookings}
        onDownload={(bookingsToExport) =>
          downloadCSV(convertToCSV(extractObj(bookingsToExport) ?? []), "bookings.csv")
        }
      />
      <BookingHistoryModal
        isOpen={historyModalOpen}
        setOpen={setHistoryModalOpen}
        title={historyTarget?.title ?? ""}
        subtitle={historyTarget?.subtitle}
        image={historyTarget?.image}
        bookings={historyTarget?.bookings ?? []}
      />
      <DeleteBookingModal
        isOpen={deleteModalOpen}
        setOpen={setDeleteModalOpen}
        booking={bookingToDelete}
        onDeleted={(bookingId) => {
          removeBooking(bookingId);
          if (expandedBookingId === bookingId) setExpandedBookingId(null);
          setToast({
            message: "Booking deleted successfully",
            variant: ToastVariant.SUCCESS,
            show: true,
          });
        }}
        onError={(message) =>
          setToast({ message, variant: ToastVariant.WARNING, show: true })
        }
      />
      <EditBookingModal
        isOpen={editModalOpen}
        setOpen={setEditModalOpen}
        booking={bookingToEdit}
        onEdited={() => {
          getBookings();
          setToast({
            message: "Booking updated successfully",
            variant: ToastVariant.SUCCESS,
            show: true,
          });
        }}
        onError={(message) =>
          setToast({ message, variant: ToastVariant.WARNING, show: true })
        }
      />
      <AdminBookingsCalendar deliveryType={deliveryType} />
      <div className="p-4 sm:px-6 lg:px-8">
        <div className="sm:flex sm:items-center">
          <div className="sm:flex-auto">
            <h1 className="text-base font-semibold leading-6 text-gray-900">
              Bookings
            </h1>
            <p className="mt-2 text-sm text-gray-700">
              A list of all the bookings in the system.
            </p>
          </div>
          <div
            ref={searchContainerRef}
            className="relative mt-4 sm:mt-0 sm:ml-4 sm:mr-4"
          >
            <div className="relative">
              <MagnifyingGlassIcon className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsSearchOpen(true);
                }}
                onFocus={() => setIsSearchOpen(true)}
                onKeyDown={(e) => e.key === "Escape" && closeSearch()}
                placeholder="Search dress or customer..."
                className="w-64 rounded-md border-0 py-1.5 pl-8 pr-3 text-sm text-gray-900 ring-1 ring-inset ring-gray-300 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-pink-500"
              />
            </div>

            {isSearchOpen && searchQuery.trim().length > 0 && (
              <div className="absolute right-0 top-full z-20 mt-1 w-96 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5">
                {dressSearchResults.length === 0 &&
                userSearchResults.length === 0 ? (
                  <p className="px-4 py-3 text-sm text-gray-500">
                    No dresses or customers found.
                  </p>
                ) : (
                  <>
                    {dressSearchResults.length > 0 && (
                      <div className="py-2">
                        <p className="px-4 pb-1 text-xs font-semibold uppercase text-gray-400">
                          Dresses
                        </p>
                        <ul>
                          {dressSearchResults.map((dress) => (
                            <li key={dress.dressId}>
                              <button
                                type="button"
                                onClick={() =>
                                  openDressHistory(
                                    dress.dressId,
                                    dress.name,
                                    dress.brand,
                                    dress.image,
                                  )
                                }
                                className="flex w-full items-center gap-3 px-4 py-2 text-left hover:bg-gray-50"
                              >
                                {dress.image && (
                                  <img
                                    src={dress.image}
                                    alt={dress.name}
                                    className="h-8 w-8 flex-shrink-0 rounded-full object-cover"
                                  />
                                )}
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-medium text-gray-900">
                                    {dress.name}
                                  </p>
                                  <p className="truncate text-xs text-gray-500">
                                    {dress.brand}
                                  </p>
                                </div>
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {userSearchResults.length > 0 && (
                      <div className="border-t border-gray-100 py-2">
                        <p className="px-4 pb-1 text-xs font-semibold uppercase text-gray-400">
                          Customers
                        </p>
                        <ul>
                          {userSearchResults.map((user) => (
                            <li key={user.userId}>
                              <button
                                type="button"
                                onClick={() =>
                                  openUserHistory(
                                    user.userId,
                                    user.name,
                                    user.email,
                                  )
                                }
                                className="flex w-full flex-col items-start px-4 py-2 text-left hover:bg-gray-50"
                              >
                                <p className="truncate text-sm font-medium text-gray-900">
                                  {user.name}
                                </p>
                                <p className="truncate text-xs text-gray-500">
                                  {user.email}
                                </p>
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setEmailModalOpen(true)}>Email</Button>
            <Button onClick={() => setCreateModalOpen(true)}>
              New booking
            </Button>
            <Button onClick={() => setDownloadModalOpen(true)}>
              Download
            </Button>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {Object.values(BookingStatus).map((status) => {
            const isActive = selectedStatuses.includes(status);
            return (
              <button
                key={status}
                onClick={() => toggleStatus(status)}
                className={`inline-flex rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                  isActive
                    ? getStatusColour(status)
                    : "bg-white text-gray-500 ring-gray-300"
                }`}
              >
                {status}
              </button>
            );
          })}
          {selectedStatuses.length > 0 && (
            <button
              onClick={() => setSelectedStatuses([])}
              className="text-xs text-gray-400 hover:text-gray-600 underline self-center"
            >
              Clear
            </button>
          )}
        </div>
        {isLoading ? (
          <div className="flex justify-center">
            <Spinner />
          </div>
        ) : (
          <div className="mt-8 flow-root">
            <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
              <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                <table className="min-w-full divide-y divide-gray-300">
                  <thead>
                    <tr>
                      <th
                        scope="col"
                        className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-0"
                      >
                        Dress
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                      >
                        User
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                      >
                        Date Booked
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                      >
                        Size
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                      >
                        Status
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900"
                      >
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    <Fragment>
                      <tr
                        className="border-t border-gray-200 cursor-pointer"
                        onClick={() => setShowThisWeek(!showThisWeek)}
                      >
                        <th
                          scope="colgroup"
                          colSpan={6}
                          className="bg-gray-50 py-2 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-3"
                        >
                          This week bookings
                        </th>
                      </tr>
                    </Fragment>
                    {filteredThisWeekBookings &&
                      showThisWeek &&
                      renderBookingRow(filteredThisWeekBookings)}
                    <Fragment>
                      <tr
                        className="border-t border-gray-200 cursor-pointer"
                        onClick={() => setShowUpcoming(!showUpcoming)}
                      >
                        <th
                          scope="colgroup"
                          colSpan={6}
                          className="bg-gray-50 py-2 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-3"
                        >
                          Upcoming bookings
                        </th>
                      </tr>
                    </Fragment>
                    {filteredBookings &&
                      showUpcoming &&
                      renderBookingRow(filteredBookings)}
                    <Fragment>
                      <tr
                        className="border-t border-gray-200 cursor-pointer"
                        onClick={() => setShowPrevious(!showPrevious)}
                      >
                        <th
                          scope="colgroup"
                          colSpan={6}
                          className="bg-gray-50 py-2 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-3"
                        >
                          Previous bookings
                        </th>
                      </tr>
                    </Fragment>
                    {filteredPastBookings &&
                      showPrevious &&
                      renderBookingRow(filteredPastBookings)}
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

export default AdminBookings;
