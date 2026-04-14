import { clearAdminSessionCookie } from "@/server/admin/auth";
import { buildRedirectResponse } from "@/server/http/redirect";

export async function POST(request: Request) {
  const response = buildRedirectResponse(request, "/login", {
    searchParams: new URLSearchParams({ loggedOut: "1" }),
  });

  clearAdminSessionCookie(response);

  return response;
}
