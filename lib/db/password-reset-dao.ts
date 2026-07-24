import { PasswordResetTokenSchema } from "./schema";

export async function createPasswordResetToken(
  userId: string,
  tokenHash: string,
  expiresAt: Date,
) {
  return PasswordResetTokenSchema.create({ userId, tokenHash, expiresAt });
}

// Returns the token doc only if it exists and hasn't expired yet.
export async function findPasswordResetToken(tokenHash: string) {
  return PasswordResetTokenSchema.findOne({
    tokenHash,
    expiresAt: { $gt: new Date() },
  });
}

export async function deletePasswordResetToken(id: string) {
  return PasswordResetTokenSchema.findByIdAndDelete(id);
}

// Called before issuing a new token so a user only ever has one live token.
export async function deleteResetTokensForUser(userId: string) {
  return PasswordResetTokenSchema.deleteMany({ userId });
}
