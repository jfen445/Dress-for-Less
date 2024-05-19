import { UserSchema } from "./schema";

export async function createUser() {
  const user = await UserSchema.create({
    email: "test",
    password: "test",
    name: "test",
    mobileNumber: "test",
    instagramHandle: "test",
  });

  return user;
}
