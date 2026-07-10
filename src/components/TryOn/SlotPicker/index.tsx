"use client";

import React from "react";
import { getTakenTryOnSlots } from "@/api/tryOnBooking";
import {
  TRY_ON_TIME_SLOTS,
  formatTryOnTimeSlot,
} from "../../../../common/constants/tryOn";

interface ISlotPicker {
  date: string;
  selectedSlot: string;
  setSelectedSlot: React.Dispatch<React.SetStateAction<string>>;
}

const SlotPicker = ({ date, selectedSlot, setSelectedSlot }: ISlotPicker) => {
  const [takenSlots, setTakenSlots] = React.useState<string[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    if (!date) return;

    setIsLoading(true);
    setSelectedSlot("");

    getTakenTryOnSlots(date)
      .then((data) => setTakenSlots(data.data.takenSlots ?? []))
      .catch(() => setTakenSlots([]))
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
      ) : (
        <div className="mt-3 grid grid-cols-3 gap-3">
          {TRY_ON_TIME_SLOTS.map((slot) => {
            const isTaken = takenSlots.includes(slot);
            const isSelected = selectedSlot === slot;
            return (
              <button
                key={slot}
                type="button"
                disabled={isTaken}
                onClick={() => setSelectedSlot(slot)}
                className={`rounded-md border px-3 py-2 text-sm font-medium ${
                  isTaken
                    ? "cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400"
                    : isSelected
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
