import { NextApiRequest, NextApiResponse } from "next";
import crypto from "crypto";
import { Resend } from "resend";
import { dbConnect } from "../../../lib/db/db";
import { findUser } from "../../../lib/db/user-dao";
import {
  createPasswordResetToken,
  deleteResetTokensForUser,
} from "../../../lib/db/password-reset-dao";
import PasswordResetEmail from "@/components/Emails/PasswordResetEmail";

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

// Same response in every branch so this endpoint can't be used to discover
// whether an email is registered.
const GENERIC_RESPONSE = {
  message: "If an account exists for that email, we've sent a reset link.",
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const rawEmail = req.body?.email;
  if (!rawEmail || typeof rawEmail !== "string") {
    return res.status(400).json({ message: "Email is required" });
  }

  const email = rawEmail.trim().toLowerCase();

  await dbConnect();

  try {
    const users = await findUser(email);
    const user = users[0];

    if (user) {
      // Raw token goes in the email; only its hash is stored.
      const token = crypto.randomBytes(32).toString("hex");
      const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
      const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

      await deleteResetTokensForUser(user._id.toString());
      await createPasswordResetToken(user._id.toString(), tokenHash, expiresAt);

      // Build from the public site base (NOT NEXTAUTH_URL, which may include
      // the /api/auth path). Strip any trailing slash to avoid a double slash.
      const baseUrl = (
        process.env.NEXT_PUBLIC_SERVER_URL ??
        process.env.NEXT_BASE_URL ??
        ""
      ).replace(/\/+$/, "");
      const url = `${baseUrl}/reset-password?token=${token}`;

      const resend = new Resend(process.env.RESEND_API_KEY as string);
      await resend.emails.send({
        from: `Dress for Less <${process.env.RESEND_EMAIL_ADDRESS}>`,
        to: [email],
        subject: "Reset your Dress for Less password",
        react: PasswordResetEmail({ url }),
      });
    }
  } catch (err) {
    // Log server-side but never surface details (and still return the generic
    // response) so the outcome can't be probed.
    console.error("forgot-password error", err);
  }

  return res.status(200).json(GENERIC_RESPONSE);
}
