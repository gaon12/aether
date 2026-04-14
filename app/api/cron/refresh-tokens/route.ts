import { type NextRequest, NextResponse } from "next/server";
import { getResolvedRuntimeSettings } from "@/server/admin/settings";
import { constantTimeEqual } from "@/server/lib/secure-compare";
import { checkAndRefreshAllTokens } from "@/server/threads/token";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const { cronSecret } = await getResolvedRuntimeSettings();

  if (!cronSecret) {
    return NextResponse.json(
      { error: "Cron secret not configured" },
      { status: 500 },
    );
  }

  if (!constantTimeEqual(authHeader, `Bearer ${cronSecret}`)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await checkAndRefreshAllTokens();
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[cron] Token refresh failed:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unknown token refresh error",
      },
      { status: 500 },
    );
  }
}
