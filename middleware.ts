import { NextRequest, NextResponse } from "next/server";
// import { decrypt } from "@/app/lib/session";
import { decrypt } from "./lib";
import { cookies } from "next/headers";
import { getToken } from "next-auth/jwt";

// 1. Specify protected and public routes
const protectedRoutes = ["/dashboard"];
const publicRoutes = ["/login", "/signup", "/"];

export { default } from "next-auth/middleware";

export const config = { matcher: ["/account"] };

// export default async function middleware(req: NextRequest) {
//   // 2. Check if the current route is protected or public
//   const path = req.nextUrl.pathname;
//   const isProtectedRoute = protectedRoutes.includes(path);
//   const isPublicRoute = publicRoutes.includes(path);

//   // 3. Decrypt the session from the cookie
//   const cookie = cookies().get("session")?.value;
//   const session = cookie ? await decrypt(cookie) : null;

//   // 5. Redirect to /login if the user is not authenticated
//   if (isProtectedRoute && !session?.userId) {
//     return NextResponse.redirect(new URL("/login", req.nextUrl));
//   }

//   // 6. Redirect to /dashboard if the user is authenticated
//   if (
//     isPublicRoute &&
//     session?.userId &&
//     !req.nextUrl.pathname.startsWith("/")
//   ) {
//     return NextResponse.redirect(new URL("/", req.nextUrl));
//   }

//   return NextResponse.next();
// }

// Routes Middleware should not run on
// export const config = {
//   matcher: ["/((?!api|_next/static|_next/image|.*\\.png$).*)"],
// };
//

export function middleware(request: NextRequest, response: NextResponse) {
  const currentUser = request.cookies.get("next-auth.session-token")?.value;
  // console.log("curent", currentUser);

  // if (currentUser && !request.nextUrl.pathname.startsWith("/")) {
  //   return Response.redirect(new URL("/", request.url));
  // }

  // if (!currentUser && !request.nextUrl.pathname.startsWith("/login")) {
  //   return Response.redirect(new URL("/login", request.url));
  // }
}
