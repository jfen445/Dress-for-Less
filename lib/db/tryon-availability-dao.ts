import { TryOnAvailabilitySchema } from "./schema";

export async function getAllTryOnAvailability() {
  return TryOnAvailabilitySchema.find({}).sort({ date: 1 });
}

export async function getAvailabilityForDate(date: string) {
  return TryOnAvailabilitySchema.findOne({ date });
}

export async function upsertTryOnAvailability(date: string, timeSlots: string[]) {
  return TryOnAvailabilitySchema.findOneAndUpdate(
    { date },
    { $set: { timeSlots } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
}

export async function deleteTryOnAvailability(date: string) {
  return TryOnAvailabilitySchema.findOneAndDelete({ date });
}
