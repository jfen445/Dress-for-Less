"use client";

import React from "react";
import { getTakenTryOnSlots } from "@/api/tryOnBooking";
import { formatTryOnTimeSlot } from "../../../../common/constants/tryOn";

interface ISlotPicker {
  date: string;
  selectedSlot: string;
  setSelectedSlot: React.Dispatch<React.SetStateAction<string>>;
}

const SlotPicker = ({ date, selectedSlot, setSelectedSlot }: ISlotPicker) => {
  const [availableSlots, setAvailableSlots] = React.useState<string[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    if (!date) return;

    setIsLoading(true);
    setSelectedSlot("");

    getTakenTryOnSlots(date)
      .then((data) => setAvailableSlots(data.data.availableSlots ?? []))
      .catch(() => setAvailableSlots([]))
      .finally(() => setIsLoading(false));
  }, [date, setSelectedSlot]);

  if (!date) {
    return (
      <p className="mt-6 text-sm text-gray-500">
        Select a date to see available time slots.
      </p>
    );
  }

  return (
    <div className="mt-6">
      <h3 className="text-sm font-medium text-gray-900">
        Available time slots
      </h3>
      {isLoading ? (
        <p className="mt-2 text-sm text-gray-500">Loading slots...</p>
      ) : availableSlots.length === 0 ? (
        <p className="mt-2 text-sm text-gray-500">
          No times available on this date.
        </p>
      ) : (
        <div className="mt-3 grid grid-cols-3 gap-3">
          {availableSlots.map((slot) => {
            const isSelected = selectedSlot === slot;
            return (
              <button
                key={slot}
                type="button"
                onClick={() => setSelectedSlot(slot)}
                className={`rounded-md border px-3 py-2 text-sm font-medium ${
                  isSelected
                    ? "border-secondary-pink bg-secondary-pink text-white"
                    : "border-gray-300 text-gray-900 hover:border-secondary-pink"
                }`}
              >
                {formatTryOnTimeSlot(slot)}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SlotPicker;
