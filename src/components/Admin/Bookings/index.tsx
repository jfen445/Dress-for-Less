import { getAllBookings } from "@/api/admin";
import SlideOver from "@/components/SlideOver";
import dayjs from "dayjs";
import React from "react";
import { Booking } from "../../../../common/types";
import Input from "@/components/Input";
import Button from "@/components/Button";
import Toggle from "@/components/Toggle";

const AdminBookings = () => {
  const [bookings, setBookings] = React.useState<Booking[]>();
  const [openSlide, setOpenSlide] = React.useState<boolean>(false);
  const [selectedBooking, setSelectedBooking] = React.useState<Booking | null>(
    null
  );

  React.useEffect(() => {
    const getBookings = async () => {
      await getAllBookings().then((data) => {
        console.log("all bookings", data);
        setBookings(data.data);
      });
    };

    getBookings();
  }, []);

  const toggleEnable = (field: any) => {
    if (selectedBooking) {
      var cloned = JSON.parse(JSON.stringify(selectedBooking));
      cloned[field] = !cloned[field];
      setSelectedBooking(cloned);
    }
  };

  const getStatus = (booking: Booking) => {
    if (booking.isReturned) {
      return "Completed";
    } else if (!booking.isShipped) {
      return "Ready to shipped";
    } else if (booking.isShipped) {
      return "Active";
    }
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
              <Input type="link" name="tracking" id="tracking" />
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
            <Button
              type="button"
              className="flex-1 rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              Save
            </Button>
          </div>
        </div>
      </SlideOver>
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
        </div>
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
                      User
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                    >
                      Dress
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
                  {bookings?.map((booking: any) => (
                    <tr key={booking._id}>
                      <td className="whitespace-nowrap py-5 pl-4 pr-3 text-sm sm:pl-0">
                        <div className="flex items-center">
                          <div className="h-11 w-11 flex-shrink-0">
                            <img
                              alt=""
                              src={booking.user[0].photo}
                              className="h-11 w-11 rounded-full"
                            />
                          </div>
                          <div className="ml-4">
                            <div className="font-medium text-gray-900">
                              {booking.user[0].name}
                            </div>
                            <div className="mt-1 text-gray-500">
                              {booking.user[0].email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-5 text-sm text-gray-500">
                        <div className="text-gray-900">
                          {booking.dress.name}
                        </div>
                        <div className="mt-1 text-gray-500">
                          {booking.dress.brand}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-5 text-sm text-gray-500">
                        {dayjs(booking.dateBooked).format("MMMM D, YYYY")}
                      </td>
                      <td className="whitespace-nowrap px-3 py-5 text-sm text-gray-500">
                        <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                          {getStatus(booking)}
                        </span>
                      </td>

                      <td className="relative whitespace-nowrap py-5 pl-3 pr-4 text-right text-sm font-medium sm:pr-0 cursor-pointer">
                        <div
                          className="text-indigo-600 hover:text-indigo-900"
                          onClick={() => {
                            setOpenSlide(true);
                            setSelectedBooking(booking);
                          }}
                        >
                          More Info
                          <span className="sr-only">
                            , {booking.user[0].name}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AdminBookings;
