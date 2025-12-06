import { getAllBookings } from "@/api/admin";
import SlideOver from "@/components/SlideOver";
import dayjs from "dayjs";
import React, { Fragment } from "react";
import { Booking, UserType } from "../../../../common/types";
import Input from "@/components/Input";
import Button from "@/components/Button";
import Toggle from "@/components/Toggle";
import Spinner from "@/components/Spinner";
import UserModal from "../UserModal";
import { updateBooking } from "@/api/booking";

const AdminBookings = () => {
  const [bookings, setBookings] = React.useState<Booking[]>();
  const [thisWeekBookings, setThisWeekBookings] = React.useState<Booking[]>();
  const [openSlide, setOpenSlide] = React.useState<boolean>(false);
  const [selectedBooking, setSelectedBooking] = React.useState<Booking | null>(
    null
  );
  const [selectedUser, setSelectedUser] = React.useState<UserType | null>(null);
  const [userModalOpen, setUserModalOpen] = React.useState<boolean>(false);
  const [isLoading, setIsLoading] = React.useState<boolean>(false);

  const [expandedBookingId, setExpandedBookingId] = React.useState<
    string | null
  >(null);

  const toggleRow = (id: string) => {
    setExpandedBookingId(expandedBookingId === id ? null : id);
  };

  const [currentBookingShipping, setCurrentBookingShipping] =
    React.useState<boolean>(false);
  const [currentBookingReturned, setCurrentBookingReturned] =
    React.useState<boolean>(false);
  const [currentBookingTracking, setCurrentBookingTracking] =
    React.useState<string>("");

  const getBookings = async () => {
    setIsLoading(true);
    const response = await getAllBookings().then((data) => {
      var d = new Date();
      d.setDate(d.getDate() + ((1 + 7 - d.getDay()) % 7 || 7));
      const now = new Date();

      const currentSunday = new Date(now);
      if (now.getDay() !== 0) {
        currentSunday.setDate(now.getDate() + (7 - now.getDay()));
      }
      currentSunday.setHours(23, 59, 59, 999);

      const sortedBookings = (data.data as unknown as Booking[]).sort(function (
        a,
        b
      ) {
        return dayjs(a.dateBooked).diff(dayjs(b.dateBooked));
      });
      const thisWeek = sortedBookings.filter((booking) =>
        dayjs(booking.dateBooked).isAfter(dayjs(currentSunday))
      );
      const allBookings = sortedBookings.filter((booking) =>
        dayjs(booking.dateBooked).isBefore(dayjs(currentSunday))
      );

      setThisWeekBookings(thisWeek);
      setBookings(allBookings);
    });
    setIsLoading(false);
  };

  React.useEffect(() => {
    getBookings();
  }, []);

  const toggleEnable = (field: any) => {
    if (selectedBooking) {
      var cloned = JSON.parse(JSON.stringify(selectedBooking));
      cloned[field] = !cloned[field];
      setCurrentBookingShipping(cloned.isShipped);
      setCurrentBookingReturned(cloned.isReturned);
      setSelectedBooking(cloned);
    }
  };

  const getStatus = (booking: Booking) => {
    if (booking.isReturned) {
      return "Completed";
    } else if (!booking.isShipped) {
      return "Ready to be shipped";
    } else if (booking.isShipped) {
      return "Active";
    }
  };

  const updateCurrentBooking = async () => {
    let bookingObj: {
      isShipped: boolean;
      isReturned: boolean;
      tracking?: string;
    } = {
      isShipped: selectedBooking?.isShipped ?? false,
      isReturned: selectedBooking?.isReturned ?? false,
    };

    if (selectedBooking?.tracking != currentBookingTracking) {
      bookingObj.tracking = currentBookingTracking;
    }

    if (selectedBooking && selectedBooking._id) {
      await updateBooking(selectedBooking._id, bookingObj)
        .catch((err) => console.log(err))
        .finally(() => getBookings());
    }
  };

  // const downloadToCSV = () => {
  //   let csvContent = "data:text/csv;charset=utf-8,"
  //   + thisWeekBookings?.map(e => e..join(",")).join("\n");
  // }
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

  const extractObj = () => {
    return thisWeekBookings?.map((booking) => ({
      name: booking.user ? booking?.user[0].name : "",
      email: booking.user ? booking?.user[0].email : "",
      address: booking.address,
      deliveryType: booking.deliveryType,
      dress: booking.dress?.name,
    }));
  };

  const renderBookingRow = (bookingList: Booking[]) => {
    const getStatusColour = (booking: Booking) => {
      let colour = "";
      switch (getStatus(booking)) {
        case "Active":
          colour = "bg-green-50 text-green-700 ring-green-600/20";
          break;
        case "Completed":
          colour = "bg-stone-50 text-stone-700 ring-stone-600/20";
          break;
        case "Ready to be shipped":
          colour = "bg-yellow-50 text-yellow-700 ring-yellow-600/20";
          break;
      }
      return colour;
    };

    return (
      <>
        {bookingList?.map((currentBooking: any) => (
          <Fragment key={currentBooking._id}>
            {/* Main row */}
            <tr
              className="cursor-pointer hover:bg-gray-50"
              onClick={() => toggleRow(currentBooking._id)}
            >
              <td className="whitespace-nowrap py-5 pl-4 pr-3 text-sm sm:pl-0">
                <div className="flex items-center">
                  <img
                    src={currentBooking.dress?.images[0]}
                    className="h-11 w-11 rounded-full cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      setUserModalOpen(true);
                      setSelectedUser(currentBooking.user?.[0]);
                    }}
                  />
                  <div className="ml-4">
                    <div>{currentBooking.dress.name}</div>
                    <div className="text-gray-500">
                      {currentBooking.dress.brand}
                    </div>
                  </div>
                </div>
              </td>

              <td className="px-3 py-5 text-sm">
                <div className="font-medium">{currentBooking.user[0].name}</div>
                <div className="text-gray-500">
                  {currentBooking.user[0].email}
                </div>
              </td>

              <td className="px-3 py-5 text-sm text-gray-500">
                {dayjs(currentBooking.dateBooked).format("MMMM D, YYYY")}
              </td>

              <td className="px-3 py-5 text-sm">
                <span
                  className={`inline-flex rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${getStatusColour(
                    currentBooking
                  )}`}
                >
                  {getStatus(currentBooking)}
                </span>
              </td>

              <td className="px-3 py-5 text-right text-sm text-indigo-600">
                {expandedBookingId === currentBooking._id
                  ? "Hide"
                  : "More Info"}
              </td>
            </tr>

            {/* EXPANDED CONTENT ROW */}
            {expandedBookingId === currentBooking._id && (
              <tr>
                <td colSpan={5} className="bg-gray-50 p-6">
                  {/* ----- Put your SlideOver content here ----- */}

                  <div className="flex space-x-6">
                    <img
                      src={currentBooking.dress?.images[0]}
                      className="h-40 w-40 rounded-lg object-cover"
                    />

                    <div className="space-y-4 flex-1">
                      <h3 className="font-semibold text-gray-900">
                        {currentBooking.dress?.name}
                      </h3>

                      <p className="text-sm">{currentBooking.dress?.brand}</p>

                      <p>
                        <span className="font-medium">Booked by:</span>{" "}
                        {currentBooking.user?.[0].name}
                      </p>

                      <p>
                        <span className="font-medium">Delivery:</span>{" "}
                        {currentBooking.deliveryType}
                      </p>

                      <p>
                        <span className="font-medium">Address:</span>{" "}
                        {currentBooking.address.address},{" "}
                        {currentBooking.address.city},{" "}
                        {currentBooking.address.country},{" "}
                        {currentBooking.address.postCode}
                      </p>
                    </div>
                  </div>

                  {/* ----- End extra content ----- */}
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
      <UserModal
        isOpen={userModalOpen}
        setOpen={setUserModalOpen}
        user={selectedUser}
      ></UserModal>
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
          <Button
            onClick={() =>
              downloadCSV(convertToCSV(extractObj() ?? []), "bookings.csv")
            }
          >
            Download
          </Button>
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
                        Status
                      </th>
                      <th
                        scope="col"
                        className="relative py-3.5 pl-3 pr-4 sm:pr-0"
                      >
                        <span className="sr-only">Edit</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    <Fragment>
                      <tr className="border-t border-gray-200">
                        <th
                          scope="colgroup"
                          colSpan={5}
                          className="bg-gray-50 py-2 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-3"
                        >
                          This week bookings
                        </th>
                      </tr>
                    </Fragment>
                    {thisWeekBookings && renderBookingRow(thisWeekBookings)}
                    <Fragment>
                      <tr className="border-t border-gray-200">
                        <th
                          scope="colgroup"
                          colSpan={5}
                          className="bg-gray-50 py-2 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-3"
                        >
                          Other bookings
                        </th>
                      </tr>
                    </Fragment>
                    {bookings && renderBookingRow(bookings)}
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
