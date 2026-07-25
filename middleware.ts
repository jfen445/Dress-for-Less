export { default } from "next-auth/middleware";

// Require a valid session before these pages render. `/admin` is additionally
// role-gated at the API layer; this just ensures anonymous visitors are sent to
// sign in rather than loading an empty shell.
export const config = { matcher: ["/account", "/admin/:path*"] };
