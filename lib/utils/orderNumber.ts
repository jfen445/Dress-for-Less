import { CounterSchema } from "../db/schema";

const ORDER_NUMBER_COUNTER_ID = "bookingOrderNumber";
const ORDER_NUMBER_PAD_LENGTH = 4;

export async function getNextOrderNumber(): Promise<string> {
  const counter = await CounterSchema.findOneAndUpdate(
    { _id: ORDER_NUMBER_COUNTER_ID },
    { $inc: { seq: 1 } },
    { new: true, upsert: true },
  );

  return `DFL-${String(counter.seq).padStart(ORDER_NUMBER_PAD_LENGTH, "0")}`;
}
