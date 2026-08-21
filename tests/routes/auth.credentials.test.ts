import { beforeEach, describe, expect, it, vi } from "vitest";
import bcrypt from "bcryptjs";
import { PASSWORD_SALT_ROUNDS } from "../../common/constants/auth";

// The server half of password sign-in: NextAuth's `authorize`, which decides
// whether an email and a password are an account. The browser half — the form
// that sends them and what it does with the answer — is tests/e2e/login.spec.ts.
//
// bcrypt is deliberately NOT mocked. Verifying a password is the entire job
// here, and a fake comparator would leave the test passing whether or not the
// hash is ever actually checked.

const findUserWithPassword = vi.fn();
const findUserAuthState = vi.fn(async () => null);
const createUser = vi.fn(async () => undefined);
vi.mock("../../lib/db/user-dao", () => ({
  findUserWithPassword,
  findUserAuthState,
  createUser,
}));

vi.mock("../../lib/db/db", () => ({
  default: Promise.resolve({}),
  dbConnect: vi.fn(async () => undefined),
}));
vi.mock("@next-auth/mongodb-adapter", () => ({ MongoDBAdapter: () => ({}) }));
// A .tsx module the route pulls in for the magic-link email, which has nothing
// to do with passwords and doesn't survive the node-environment transform.
vi.mock("@/components/Emails/MagicLinkEmail", () => ({ default: () => null }));
vi.mock("resend", () => ({ Resend: class {} }));

const { authOptions } = await import("../../pages/api/auth/[...nextauth]");

// CredentialsProvider keeps what it was configured with under `options`; the
// top-level `authorize` is the library's own placeholder.
const credentials = authOptions.providers.find(
  (provider) => provider.id === "credentials",
) as any;
const authorize = credentials.options.authorize as (
  credentials: Record<string, string> | undefined,
) => Promise<unknown>;

const EMAIL = "customer@example.com";
const PASSWORD = "correct-horse-battery-staple";

const account = async (over: Record<string, unknown> = {}) => ({
  _id: "user-1",
  email: EMAIL,
  name: "Ada Lovelace",
  photo: null,
  password: await bcrypt.hash(PASSWORD, PASSWORD_SALT_ROUNDS),
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("the password is right", () => {
  it("returns the account, and never its hash", async () => {
    findUserWithPassword.mockResolvedValue(await account());

    const user = (await authorize({ email: EMAIL, password: PASSWORD })) as any;

    expect(user).toMatchObject({ id: "user-1", email: EMAIL });
    // What comes back here becomes the JWT, so anything on it is on the wire.
    expect(user).not.toHaveProperty("password");
  });

  it("looks the account up by its normalised email", async () => {
    // Addresses are stored lowercase; a customer typing theirs with a capital
    // or a trailing space is still that customer.
    findUserWithPassword.mockResolvedValue(await account());

    await authorize({ email: `  ${EMAIL.toUpperCase()} `, password: PASSWORD });

    expect(findUserWithPassword).toHaveBeenCalledWith(EMAIL);
  });
});

describe("the password is wrong, or there is none to check", () => {
  it("refuses a wrong password", async () => {
    findUserWithPassword.mockResolvedValue(await account());

    await expect(
      authorize({ email: EMAIL, password: "not-the-password" }),
    ).resolves.toBeNull();
  });

  it("refuses an email with no account", async () => {
    findUserWithPassword.mockResolvedValue(null);

    await expect(
      authorize({ email: EMAIL, password: PASSWORD }),
    ).resolves.toBeNull();
  });

  it("still runs a comparison when there is no account", async () => {
    // The dummy hash exists so a missing account costs the same time as a wrong
    // password. Skipping the compare would leak, by timing, which emails are
    // registered — so this asserts the work is done, not just the answer.
    findUserWithPassword.mockResolvedValue(null);
    const compare = vi.spyOn(bcrypt, "compare");

    await authorize({ email: EMAIL, password: PASSWORD });

    expect(compare).toHaveBeenCalled();
    compare.mockRestore();
  });

  it("refuses an account that has no password set", async () => {
    // Signed up through Google or a magic link: there is nothing to verify
    // against, and an empty hash must not become an open door.
    findUserWithPassword.mockResolvedValue(await account({ password: undefined }));

    await expect(
      authorize({ email: EMAIL, password: PASSWORD }),
    ).resolves.toBeNull();
  });

  it("refuses a blank password without touching the database", async () => {
    await expect(
      authorize({ email: EMAIL, password: "" }),
    ).resolves.toBeNull();
    await expect(authorize(undefined)).resolves.toBeNull();

    expect(findUserWithPassword).not.toHaveBeenCalled();
  });
});
