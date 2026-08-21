import {
  data,
  expect,
  test,
  type Api,
  type StubContext,
} from "./fixtures/app";
import { sessionCookieHeader } from "./fixtures/auth";

// Password sign-in as the customer meets it.
//
// The verification itself is NextAuth's `authorize` running against MongoDB and
// bcrypt inside the server, which this offline suite can't reach — that is
// covered by tests/routes/auth.credentials.test.ts. What the browser owns, and
// what these pin, is the form around it: that the credentials typed in reach
// the credentials provider, and what the page does with each answer it gets.

const EMAIL = data.CUSTOMER_EMAIL;
const PASSWORD = "correct-horse-battery-staple";

/**
 * Answers the credentials provider gives, and everything a successful one
 * leaves behind: the session NextAuth's client re-reads the instant the
 * callback returns, and the session cookie the middleware guarding /account
 * checks for. Both are set from inside the stub because in the real thing both
 * are consequences of that one response.
 */
function credentialsProvider(api: Api, answer: (origin: string) => string) {
  let accepted = false;

  api.set("GET /api/auth/providers", data.providers());
  api.set("GET /api/auth/session", () => (accepted ? data.session() : {}));
  api.set("GET /api/user", () =>
    accepted ? data.user() : { status: 401, json: { error: "Unauthorized" } },
  );
  api.set("POST /api/auth/callback/credentials", async ({ url }: StubContext) => {
    const returned = answer(url.origin);
    accepted = !new URL(returned).searchParams.has("error");

    return {
      json: { url: returned },
      headers: accepted
        ? { "set-cookie": await sessionCookieHeader() }
        : undefined,
    };
  });
}

// Both sign-in forms on this page use the same placeholder, so the credentials
// fields are addressed by id rather than by what they look like.
async function signIn(page: any, password = PASSWORD) {
  await page.goto("/login");
  await page.locator("#credentials-email").fill(EMAIL);
  await page.locator("#credentials-password").fill(password);
  await page.getByRole("button", { name: "Sign in with password" }).click();
}

test("hands the typed email and password to the credentials provider", async ({
  page,
  api,
}) => {
  credentialsProvider(api, (origin) => `${origin}/account`);

  await signIn(page);

  await expect
    .poll(() => api.called("POST", "/api/auth/callback/credentials").length)
    .toBe(1);

  const [post] = api.called("POST", "/api/auth/callback/credentials");
  expect(post.body).toMatchObject({ email: EMAIL, password: PASSWORD });
});

test("signs the customer in and lands them on their account", async ({
  page,
  api,
}) => {
  credentialsProvider(api, (origin) => `${origin}/account`);

  await signIn(page);

  // It goes past "/" on the way: the login page's own effect bounces an
  // authenticated visitor home at the same moment the form replaces to its
  // callbackUrl. The callbackUrl is the one that sticks.
  await page.waitForURL("**/account", { timeout: 10_000 });

  // /account is behind NextAuth middleware, so rendering at all is the proof
  // that the sign-in produced a session the *server* accepts — not just a
  // React tree that thinks it has one.
  await expect(
    page.getByRole("heading", { name: "Account Information" }),
  ).toBeVisible();
  await expect(page.locator("#email")).toHaveValue(EMAIL);
});

test("a wrong password is refused, without saying which half was wrong", async ({
  page,
  api,
}) => {
  // What the real route answers with when `authorize` returns null: a 200,
  // carrying the failure on the URL rather than in the status.
  credentialsProvider(
    api,
    (origin) => `${origin}/login?error=CredentialsSignin`,
  );

  await signIn(page, "not-the-password");

  await expect(page.getByText("Invalid email or password")).toBeVisible();
  expect(new URL(page.url()).pathname).toBe("/login");

  // Still anonymous: the form is still there to try again, and nothing
  // navigated them onward.
  await expect(
    page.getByRole("button", { name: "Sign in with password" }),
  ).toBeVisible();
});
