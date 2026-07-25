import { NextApiRequest, NextApiResponse } from "next";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { dbConnect } from "../../../lib/db/db";
import { updateUserPassword } from "../../../lib/db/user-dao";
import {
  findPasswordResetToken,
  deletePasswordResetToken,
} from "../../../lib/db/password-reset-dao";
import {
  PASSWORD_SALT_ROUNDS,
  MIN_PASSWORD_LENGTH,
} from "../../../common/constants/auth";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { token, password } = req.body ?? {};

  if (!token || typeof token !== "string") {
    return res.status(400).json({ message: "Reset token is required" });
  }
  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    return res.status(400).json({
      message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
    });
  }

  await dbConnect();

  // Look the token up by its hash; only unexpired tokens are returned.
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const resetToken = await findPasswordResetToken(tokenHash);

  if (!resetToken) {
    return res
      .status(400)
      .json({ message: "This reset link is invalid or has expired." });
  }

  const passwordHash = await bcrypt.hash(password, PASSWORD_SALT_ROUNDS);
  await updateUserPassword(resetToken.userId.toString(), passwordHash);

  // Single use: consume the token so the link can't be replayed.
  await deletePasswordResetToken(resetToken._id.toString());

  return res.status(200).json({ message: "Password updated" });
}
