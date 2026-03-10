import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Root path always redirects to welcome splash (for ALL users, even logged in)
  if (pathname === "/") {
    return NextResponse.redirect(new URL("/welcome", request.url));
  }

  // All other protected routes require auth
  const token = await getToken({ req: request });

  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match root path explicitly
    "/",
    // Match all other paths except public routes
    "/((?!welcome|login|register|api/auth|_next/static|_next/image|favicon.ico).*)",
  ],
};
