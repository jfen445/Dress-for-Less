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

  const renderBookingRow = (booking: Booking[]) => {
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
        {booking?.map((currentBooking: any) => (
          <tr key={currentBooking._id}>
            <td className="whitespace-nowrap py-5 pl-4 pr-3 text-sm sm:pl-0">
              <div className="flex items-center">
                <div className="h-11 w-11 flex-shrink-0">
                  <img
                    alt=""
                    src={currentBooking.dress.images[0]}
                    className="h-11 w-11 rounded-full cursor-pointer"
                    onClick={() => {
                      setUserModalOpen(true);
                      setSelectedUser(currentBooking.user[0]);
                    }}
                  />
                </div>
                <div className="ml-4">
                  <div className="text-gray-900">
                    {currentBooking.dress.name}
                  </div>
                  <div className="mt-1 text-gray-500">
                    {currentBooking.dress.brand}
                  </div>
                </div>
              </div>
            </td>
            <td className="whitespace-nowrap px-3 py-5 text-sm text-gray-500">
              <div className="font-medium text-gray-900">
                {currentBooking.user[0].name}
              </div>
              <div className="mt-1 text-gray-500">
                {currentBooking.user[0].email}
              </div>
            </td>
            <td className="whitespace-nowrap px-3 py-5 text-sm text-gray-500">
              {dayjs(currentBooking.dateBooked).format("MMMM D, YYYY")}
            </td>
            <td className="whitespace-nowrap px-3 py-5 text-sm text-gray-500">
              <span
                className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${getStatusColour(
                  currentBooking
                )}`}
              >
                {getStatus(currentBooking)}
              </span>
            </td>

            <td className="relative whitespace-nowrap py-5 pl-3 pr-4 text-right text-sm font-medium sm:pr-0 cursor-pointer">
              <div
                className="text-indigo-600 hover:text-indigo-900"
                onClick={() => {
                  setOpenSlide(true);
                  setSelectedBooking(currentBooking);
                }}
              >
                More Info
                <span className="sr-only">, {currentBooking.user[0].name}</span>
              </div>
            </td>
          </tr>
        ))}
      </>
    );
  };

  return (
    <>
      <SlideOver
        isOpen={openSlide}
        setOpen={setOpenSlide}
        bookingInfo={selectedBooking}
      >
        <div className="space-y-6 pb-16">
          <div>
            <div className="aspect-h-7 aspect-w-10 block w-full overflow-hidden rounded-lg">
              <img
                alt=""
                src={selectedBooking?.dress?.images[0]}
                className="object-cover"
              />
            </div>
            <div className="mt-4 flex items-start justify-between">
              <div>
                <h2 className="text-base font-semibold leading-6 text-gray-900">
                  <span className="sr-only">Details for </span>
                  {selectedBooking?.dress?.name}
                </h2>
                <p className="text-sm font-medium text-gray-500">
                  {selectedBooking?.dress?.brand}
                </p>
              </div>
            </div>
          </div>
          <div>
            <h3 className="font-medium text-gray-900">Booked by</h3>
            <dl className="mt-2 divide-y divide-gray-200 border-b border-t border-gray-200">
              <div className="flex justify-between py-3 text-sm font-medium">
                <dt className="text-gray-500">Name</dt>
                <dd className="text-gray-900">
                  {selectedBooking?.user && selectedBooking?.user[0]?.name}
                </dd>
              </div>
              <div className="flex justify-between py-3 text-sm font-medium">
                <dt className="text-gray-500">Date</dt>
                <dd className="text-gray-900">
                  {dayjs(selectedBooking?.dateBooked).format("MMMM D, YYYY")}
                </dd>
              </div>
              <div className="flex justify-between py-3 text-sm font-medium">
                <dt className="text-gray-500">Size</dt>
                <dd className="text-gray-900">{selectedBooking?.size}</dd>
              </div>
            </dl>
          </div>
          <div>
            <h3 className="font-medium text-gray-900">Address</h3>
            <div className="mt-2 flex items-center justify-between">
              <p className="text-sm italic text-gray-500">
                {selectedBooking?.address}
              </p>
            </div>
          </div>

          <div>
            <h3 className="font-medium text-gray-900">Delivery Type</h3>
            <div className="mt-2 flex items-center justify-between">
              <p className="text-sm italic text-gray-500">
                {selectedBooking?.deliveryType}
              </p>
            </div>
          </div>

          <div>
            <h3 className="font-medium text-gray-900">Tracking</h3>
            <div className="mt-2 flex items-center justify-between">
              <Input
                type="link"
                name="tracking"
                id="tracking"
                value={currentBookingTracking}
                onChange={(e) =>
                  setCurrentBookingTracking(
                    (e.target as HTMLInputElement).value
                  )
                }
              />
            </div>
          </div>

          <div>
            <div className="mt-2 flex items-center justify-between">
              <Toggle
                title={"Mark as shipped"}
                description={"Tick this box if dress has been shipped"}
                enabled={selectedBooking?.isShipped || false}
                setEnabled={() => toggleEnable("isShipped")}
              />
            </div>
          </div>

          <div>
            <div className="mt-2 flex items-center justify-between">
              <Toggle
                title={"Mark booking as completed"}
                description={"Tick this box if dress has been returned"}
                enabled={selectedBooking?.isReturned || false}
                setEnabled={() => toggleEnable("isReturned")}
              />
            </div>
          </div>

          <div className="flex">
            <Button type="button" onClick={() => updateCurrentBooking()}>
              Save
            </Button>
          </div>
        </div>
      </SlideOver>

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
