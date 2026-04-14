import { type NextRequest, NextResponse } from "next/server";
import { uuidv7 } from "uuidv7";
import {
  getAdminSessionFromRequest,
  verifyThreadsOauthState,
} from "@/server/admin/auth";
import { getResolvedRuntimeSettings } from "@/server/admin/settings";
import { getDb } from "@/server/db";
import { resolvePublicAppUrlFromRequest } from "@/server/http/public-url";
import { encrypt } from "@/server/lib/crypto";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const state = searchParams.get("state");

  if (error) {
    console.error("Threads OAuth error:", error);
    return NextResponse.json({ error }, { status: 400 });
  }

  if (!code) {
    return NextResponse.json({ error: "No code provided" }, { status: 400 });
  }

  const settings = await getResolvedRuntimeSettings();
  const threadsAppId = settings.threadsAppId;
  const threadsAppSecret = settings.threadsAppSecret;
  const appUrl =
    resolvePublicAppUrlFromRequest(request, settings.nextPublicAppUrl) ??
    request.nextUrl.origin;

  if (!threadsAppId || !threadsAppSecret) {
    console.error("Missing Threads API configuration");
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 },
    );
  }

  const adminSession = await getAdminSessionFromRequest(request);
  if (!adminSession) {
    return NextResponse.redirect(
      `${appUrl}/login?error=${encodeURIComponent("관리자 세션이 만료되어 Threads 연결을 완료할 수 없습니다. 다시 로그인 후 재시도해 주세요.")}`,
    );
  }

  if (!verifyThreadsOauthState(state, adminSession.adminUserId)) {
    return NextResponse.redirect(
      `${appUrl}/admin/api?error=${encodeURIComponent("OAuth state 검증에 실패했습니다. 보안을 위해 연결을 중단했습니다. 다시 시도해 주세요.")}`,
    );
  }

  try {
    // 1. Exchange code for short-lived access token
    const shortLivedTokenResponse = await fetch(
      "https://graph.threads.net/oauth/access_token",
      {
        method: "POST",
        body: new URLSearchParams({
          client_id: threadsAppId,
          client_secret: threadsAppSecret,
          grant_type: "authorization_code",
          redirect_uri: `${appUrl}/api/auth/threads/callback`,
          code,
        }),
      },
    );

    const shortLivedTokenData = await shortLivedTokenResponse.json();
    if (!shortLivedTokenResponse.ok) {
      throw new Error(
        `Failed to exchange short-lived token: ${JSON.stringify(shortLivedTokenData)}`,
      );
    }

    const { access_token: shortLivedToken, user_id } = shortLivedTokenData;

    // 2. Exchange short-lived token for long-lived token
    const longLivedTokenResponse = await fetch(
      `https://graph.threads.net/access_token?grant_type=th_exchange_token&client_secret=${threadsAppSecret}&access_token=${shortLivedToken}`,
    );

    const longLivedTokenData = await longLivedTokenResponse.json();
    if (!longLivedTokenResponse.ok) {
      throw new Error(
        `Failed to exchange long-lived token: ${JSON.stringify(longLivedTokenData)}`,
      );
    }

    const {
      access_token: longLivedToken,
      expires_in,
      token_type,
    } = longLivedTokenData;

    // 3. Get User profile (to get username)
    const userProfileResponse = await fetch(
      `https://graph.threads.net/me?fields=id,username&access_token=${longLivedToken}`,
    );
    const userProfileData = await userProfileResponse.json();
    if (!userProfileResponse.ok) {
      throw new Error(
        `Failed to fetch Threads profile: ${JSON.stringify(userProfileData)}`,
      );
    }

    const username =
      typeof userProfileData.username === "string" &&
      userProfileData.username.trim()
        ? userProfileData.username.trim()
        : null;
    const profileUserId =
      typeof userProfileData.id === "string" ||
      typeof userProfileData.id === "number"
        ? String(userProfileData.id)
        : null;

    if (!profileUserId) {
      throw new Error("Threads profile response did not include a user id.");
    }

    if (!username) {
      throw new Error("Threads profile response did not include a username.");
    }

    // 4. Save to database
    const db = getDb();
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + expires_in * 1000).toISOString();

    await db
      .insertInto("threads_accounts")
      .values({
        account_id: uuidv7(),
        threads_user_id: profileUserId,
        username,
        access_token_encrypted: encrypt(longLivedToken),
        token_expires_at: expiresAt,
        token_last_checked_at: now,
        token_last_refreshed_at: now,
        scopes_json: JSON.stringify({ token_type }),
        created_at: now,
        updated_at: now,
      })
      .onConflict((oc) =>
        oc.column("threads_user_id").doUpdateSet({
          username,
          access_token_encrypted: encrypt(longLivedToken),
          token_expires_at: expiresAt,
          token_last_checked_at: now,
          token_last_refreshed_at: now,
          updated_at: now,
        }),
      )
      .execute();

    return NextResponse.redirect(`${appUrl}/admin/api?auth=success`);
  } catch (error) {
    console.error("Threads OAuth callback error:", error);
    const message =
      error instanceof Error ? error.message : "Unknown Threads OAuth error";
    return NextResponse.redirect(
      `${appUrl}/admin/api?error=${encodeURIComponent(message)}`,
    );
  }
}
