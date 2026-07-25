// bcrypt cost factor for password hashing. Shared so the real signup hash and
// the login timing-defense dummy hash can never drift apart — if you raise this
// to strengthen hashing, both update together automatically.
export const PASSWORD_SALT_ROUNDS = 12;

// Minimum length enforced at signup.
export const MIN_PASSWORD_LENGTH = 8;
