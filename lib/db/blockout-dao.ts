import { BlockOutSchema } from "./schema";

export async function getAllBlockOuts() {
  return BlockOutSchema.find({});
}

export async function getBlockOutsByDress(dressId: string) {
  return BlockOutSchema.find({ dressId });
}

export async function checkBlockOut(dressId: string, size: string, date: string) {
  return BlockOutSchema.findOne({
    dressId,
    size,
    startDate: { $lte: date },
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
