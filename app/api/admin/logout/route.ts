import { NextResponse } from "next/server";
import { clearAdminSessionCookie } from "@/server/admin/auth";

export async function POST(request: Request) {
  const response = NextResponse.redirect(
    new URL("/login?loggedOut=1", request.url),
    { status: 303 },
  );

  clearAdminSessionCookie(response);

  return response;
}
