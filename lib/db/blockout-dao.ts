import { BlockOutSchema } from "./schema";

export async function getAllBlockOuts() {
  return BlockOutSchema.find({});
}

export async function getBlockOutsByDress(dressId: string) {
  return BlockOutSchema.find({ dressId });
}

// Overlap between [date, endDate] and the block-out's own range. endDate
// defaults to date, which reduces this to the original single-day test — an
// extended rental has to check its whole span, or a block-out sitting in the
// middle of it would go unnoticed.
export async function checkBlockOut(
  dressId: string,
  size: string,
  date: string,
  endDate: string = date,
) {
  return BlockOutSchema.findOne({
    dressId,
    size,
    startDate: { $lte: endDate },
    endDate: { $gte: date },
  });
}

export async function createBlockOut(data: {
  dressId: string;
  size: string;
  startDate: string;
  endDate: string;
  reason?: string;
}) {
  return BlockOutSchema.create(data);
}

export async function deleteBlockOut(id: string) {
  return BlockOutSchema.findByIdAndDelete(id);
}
