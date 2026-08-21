import { encode } from "next-auth/jwt";
import { CUSTOMER_EMAIL, USER_ID } from "./data";

// Some pages are gated by real NextAuth middleware (middleware.ts matches
// /account and /admin/*), which runs inside the dev server and reads the
// session *cookie* — nothing the browser-side /api/auth/session stub can
// satisfy. Faking the session at the API layer alone gets an authenticated
// React tree that the middleware still bounces to /api/auth/signin.
//
// So the cookie is minted for real, with next-auth's own encoder and the same
// secret the dev server runs with. That secret is exported from here and read
// by playwright.config.ts, so the two can't drift.

export const NEXTAUTH_SECRET = "e2e-test-secret-not-a-real-secret";

// The name next-auth uses over plain http; the __Secure- prefix only applies
// when NEXTAUTH_URL is https, which the E2E server's never is.
export const SESSION_COOKIE = "next-auth.session-token";

export async function sessionToken(over: Record<string, unknown> = {}) {
  return encode({
    token: {
      name: "Ada Lovelace",
      email: CUSTOMER_EMAIL,
      sub: USER_ID,
      ...over,
    },
    secret: NEXTAUTH_SECRET,
  });
}

/** The Set-Cookie header the real credentials callback answers with. */
export async function sessionCookieHeader(over: Record<string, unknown> = {}) {
  const token = await sessionToken(over);
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax`;
}
