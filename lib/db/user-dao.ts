import { UserSchema } from "./schema";
import { UserType } from "../../common/types";
import bcrypt from "bcrypt";

export async function createUser(user: UserType) {
  // const hashedPassword = await bcrypt.hash(user.password, 10);

  const newUser = await UserSchema.create({
    email: user.email,
    password: user.password,
    name: user.name,
    mobileNumber: user.mobileNumber,
    instagramHandle: user.instagramHandle ?? "",
  });

  return newUser;
}
