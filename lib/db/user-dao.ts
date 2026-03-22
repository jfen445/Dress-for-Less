import { UserSchema } from "./schema";
import { UserType } from "../../common/types";
import clientPromise from "./db";

export async function createUser(user: UserType) {
  const client = await clientPromise;
  const db = client.db();
  const collection = db.collection(UserSchema.collection.name);

  // 1. Check if user already exists
  const existingUser = await collection.findOne({ email: user.email });

  if (existingUser) {
    return existingUser; // ✅ return without modifying
  }

  // 2. Create new user
  const newUser = await collection.insertOne({
    email: user.email,
    name: user.name,
    mobileNumber: user.mobileNumber,
    instagramHandle: user.instagramHandle,
    role: user.role,
  });

  // 3. Return newly created user
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
