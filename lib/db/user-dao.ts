import { UserSchema } from "./schema";
import { UserType } from "../../common/types";

export async function createUser(user: UserType) {
  // const hashedPassword = await bcrypt.hash(user.password, 10);

  const newUser = await UserSchema.create({
    email: user.email,
    name: user.name,
    mobileNumber: user.mobileNumber,
    instagramHandle: user.instagramHandle ?? "",
  });

  return newUser;
}

export async function findUser(email: String) {
  return UserSchema.find(
    { email },
    "__id name email mobileNumber instagramHandle"
  );
}
