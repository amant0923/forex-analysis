import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request });

  if (!token) {
    // Unauthenticated: redirect to welcome splash instead of login
    const welcomeUrl = new URL("/welcome", request.url);
    welcomeUrl.searchParams.set("callbackUrl", request.url);
    return NextResponse.redirect(welcomeUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!welcome|login|register|api/auth|_next/static|_next/image|favicon.ico).*)"],
};
