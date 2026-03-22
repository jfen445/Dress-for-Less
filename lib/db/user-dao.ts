import { UserSchema } from "./schema";
import { UserType } from "../../common/types";
import clientPromise from "./db";

export async function createUser(user: UserType) {
  // const hashedPassword = await bcrypt.hash(user.password, 10);

  const client = await clientPromise;
  const db = client.db();

  const newUser = await db
    .collection(UserSchema.collection.name)
    .updateOne({ email: user.email }, { $set: user }, { upsert: true });

  // const newUser = await UserSchema.create({
  //   email: user.email,
  //   name: user.name,
  //   mobileNumber: user.mobileNumber,
  //   instagramHandle: user.instagramHandle ?? "",
  // });

  return newUser;
}

export async function findUser(email: String) {
  return UserSchema.find(
    { email },
    "__id name email mobileNumber instagramHandle photo role",
  );
}

export async function findAllUsers() {
  return UserSchema.find(
    {},
    "__id name email mobileNumber instagramHandle photo role",
  );
}
