import { NextResponse } from "next/server";
import { getAdminSessionFromRequest } from "@/server/admin/auth";

export async function GET(request: Request) {
  return NextResponse.json({
    authenticated: Boolean(await getAdminSessionFromRequest(request)),
  });
}
