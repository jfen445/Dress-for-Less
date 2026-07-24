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

// Credential signup: insert a new user with a pre-hashed password. Kept
// separate from `createUser` (used by OAuth sign-in), which intentionally
// ignores passwords.
export async function createUserWithPassword(user: {
  email: string;
  name: string;
  mobileNumber: string;
  instagramHandle: string;
  passwordHash: string;
}) {
  const client = await clientPromise;
  const db = client.db();
  const collection = db.collection(UserSchema.collection.name);

  return collection.insertOne({
    email: user.email,
    name: user.name,
    mobileNumber: user.mobileNumber,
    instagramHandle: user.instagramHandle,
    password: user.passwordHash,
    role: "user",
  });
}

export async function findUser(email: String) {
  return UserSchema.find(
    { email },
    "__id name email mobileNumber instagramHandle photo role",
  );
}

// Login only: explicitly pulls in the (normally hidden) password hash so the
// credential provider can verify it. Never expose the result to clients.
export async function findUserWithPassword(email: string) {
  return UserSchema.findOne({ email }).select(
    "+password email name photo role",
  );
}

export async function findUserById(id: string) {
  return UserSchema.findById(
    id,
    "__id name email mobileNumber instagramHandle photo role",
  );
}

export async function findAllUsers() {
  return UserSchema.find(
    {},
    "__id name email mobileNumber instagramHandle photo role",
  );
}
