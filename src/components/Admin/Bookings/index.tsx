import { getAllBookings } from "@/api/admin";
import dayjs from "dayjs";
import React, { Fragment } from "react";
import { Booking, UserType } from "../../../../common/types";
import Button from "@/components/Button";
import Spinner from "@/components/Spinner";
import UserModal from "../UserModal";
import CreateBookingModal from "../CreateBookingModal";
import EmailBookingsModal from "../EmailBookingsModal";
import DownloadBookingsModal from "../DownloadBookingsModal";
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

  const [showThisWeek, setShowThisWeek] = React.useState<boolean>(true);
  const [showPrevious, setShowPrevious] = React.useState<boolean>(true);
  const [showUpcoming, setShowUpcoming] = React.useState<boolean>(true);

  const [expandedBookingId, setExpandedBookingId] = React.useState<
    string | null
  >(null);
  const [selectedStatuses, setSelectedStatuses] = React.useState<
    BookingStatus[]
  >([]);

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

  const extractObj = (bookingsToExport: Booking[]) => {
    return bookingsToExport?.map((booking) => ({
      name: booking.user ? booking?.user[0].name : "",
      email: booking.user ? booking?.user[0].email : "",
      company: booking.address?.company ?? "",
      address: booking.address?.address ?? "",
      apartment: booking.address?.apartment ?? "",
      suburb: booking.address?.suburb ?? "",
      city: booking.address?.city ?? "",
      postCode: booking.address?.postCode ?? "",
      deliveryType: booking.deliveryType,
      dress: booking.dress?.name,
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
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </div>
    );
  };

  const getStatusBgColour = (status: BookingStatus) => {
    switch (status) {
      case BookingStatus.BeingReturned:
        return "bg-purple-50";
      case BookingStatus.Washing:
        return "bg-blue-50";
      case BookingStatus.Drying:
        return "bg-lime-50";
      case BookingStatus.Packed:
        return "bg-orange-50";
      case BookingStatus.Delayed:
        return "bg-red-50";
      case BookingStatus.Reparing:
        return "bg-stone-50";
      case BookingStatus.Returned:
        return "bg-green-50";
      case BookingStatus.NA:
      default:
        return "bg-gray-50";
    }
  };

  const getStatusColour = (status: BookingStatus) => {
    let colour = "";
    switch (status) {
      case BookingStatus.BeingReturned:
        colour = "bg-purple-50 text-purple-700 ring-purple-600/20";
        break;
      case BookingStatus.Washing:
        colour = "bg-blue-50 text-blue-700 ring-blue-600/20";
        break;
      case BookingStatus.Drying:
        colour = "bg-lime-50 text-lime-700 ring-lime-600/20";
        break;
      case BookingStatus.Packed:
        colour = "bg-orange-50 text-orange-700 ring-orange-600/20";
        break;
      case BookingStatus.Delayed:
        colour = "bg-red-50 text-red-700 ring-red-600/20";
        break;
      case BookingStatus.Reparing:
        colour = "bg-stone-50 text-stone-700 ring-stone-600/20";
        break;
      case BookingStatus.Returned:
        colour = "bg-green-50 text-green-700 ring-green-600/20";
        break;
      case BookingStatus.NA:
        colour = "bg-gray-50 text-gray-700 ring-gray-600/20";
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
            </tr>

            {/* EXPANDED CONTENT ROW */}
            {expandedBookingId === currentBooking._id && (
              <tr>
                <td colSpan={6} className="bg-gray-50 p-6">
                  {/* ----- Put your SlideOver content here ----- */}

                  <div className="flex space-x-6">
                    <img
                      src={currentBooking.dress?.images[0]}
                      alt={currentBooking.dress?.name ?? ""}
                      className="h-40 w-40 rounded-lg object-cover"
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
                          colSpan={5}
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
                          colSpan={5}
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
                          colSpan={5}
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
