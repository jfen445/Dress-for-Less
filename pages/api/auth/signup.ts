import { dbConnect } from "../../../lib/db/db";
import { NextApiRequest, NextApiResponse } from "next";
import { createUserWithPassword, findUser } from "../../../lib/db/user-dao";
import bcrypt from "bcryptjs";
import {
  PASSWORD_SALT_ROUNDS,
  MIN_PASSWORD_LENGTH,
} from "../../../common/constants/auth";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const {
    email,
    name,
    password,
    mobileNumber,
    instagramHandle,
  } = req.body?.user ?? {};

  if (!email || !EMAIL_REGEX.test(email)) {
    return res.status(400).json({ message: "A valid email is required" });
  }
  if (!name || !name.trim()) {
    return res.status(400).json({ message: "Name is required" });
  }
  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    return res.status(400).json({
      message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
    });
  }

  await dbConnect();

  const normalizedEmail = email.trim().toLowerCase();

  const existing = await findUser(normalizedEmail);
  if (existing.length > 0) {
    return res
      .status(409)
      .json({ message: "An account with this email already exists" });
  }

  const passwordHash = await bcrypt.hash(password, PASSWORD_SALT_ROUNDS);

  await createUserWithPassword({
    email: normalizedEmail,
    name: name.trim(),
    mobileNumber: mobileNumber ?? "",
    instagramHandle: instagramHandle ?? "",
    passwordHash,
  });

  return res.status(201).json({ message: "Account created" });
}
