import * as React from "react";
import { Fragment } from "react";
import { Transition } from "@headlessui/react";
import { CheckCircleIcon } from "@heroicons/react/24/solid";
// import { XIcon } from "@heroicons/react/24/outline";

type NotificationProps = {
  toast: ToastType;
  setToast: (toast: ToastType) => void;
  title: string;
  text?: string;
  duration?: number;
};

export type ToastType = {
  message: string;
  variant: "success" | "error" | "warning";
  show: boolean;
};

const Toast: React.FC<NotificationProps> = ({
  toast,
  setToast,
  title,
  text,
  duration = 3000,
}) => {
  React.useEffect(() => {
    if (toast?.show) {
      const timer = setTimeout(() => {
        setToast({ ...toast, show: false });
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [toast, duration, setToast]);

  if (!toast) {
    return null; // Return null instead of undefined to avoid rendering issues
  }

  const getColour = () => {
    if (toast.variant == "success") {
      return "bg-green-500";
    } else if (toast.variant == "error") {
      return "bg-red-500";
    } else {
      return "bg-orange-400";
    }
  };
  return (
    <>
      {/* Global notification live region, render this permanently at the end of the document */}
      <div
        aria-live="assertive"
        className="fixed inset-0 flex items-end px-4 py-6 pointer-events-none sm:p-6 sm:items-start"
      >
        <div className="w-full flex flex-col items-center space-y-4 sm:items-end">
          {/* Notification panel, dynamically insert this into the live region when it needs to be displayed */}
          <Transition
            show={toast.show}
            as={Fragment}
            enter="transform ease-out duration-3f00 transition"
            enterFrom="translate-y-2 opacity-0 sm:translate-y-0 sm:translate-x-2"
            enterTo="translate-y-0 opacity-100 sm:translate-x-0"
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div
              className={`${getColour()} max-w-sm w-full shadow-lg rounded-lg pointer-events-auto ring-1 ring-black ring-opacity-5 overflow-hidden`}
            >
              <div className="p-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <CheckCircleIcon
                      className="h-6 w-6 text-white"
                      aria-hidden="true"
                    />
                  </div>
                  <div className="ml-3 w-0 flex-1 pt-0.5">
                    <p className="text-sm font-medium text-gray-900">{title}</p>
                    <p className="mt-1 text-sm text-gray-500">{text}</p>
                  </div>
                  <div className="ml-4 flex-shrink-0 flex">
                    <button
                      className={`${getColour()} rounded-md inline-flex text-white hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
                      onClick={() => {
                        setToast({ ...toast, show: false });
                      }}
                    >
                      <span className="sr-only">Close</span>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="size-6"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </Transition>
        </div>
      </div>
    </>
  );
};

export default Toast;
