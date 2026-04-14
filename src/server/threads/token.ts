import { uuidv7 } from "uuidv7";

import { getDb } from "../db";
import { decrypt, encrypt } from "../lib/crypto";

/**
 * Gets a valid access token for a given user.
 * If the token is near expiration, it attempts to refresh it.
 */
export async function getValidAccessToken(
  threadsUserId: string,
): Promise<string | null> {
  const db = getDb();
  const account = await db
    .selectFrom("threads_accounts")
    .selectAll()
    .where("threads_user_id", "=", threadsUserId)
    .executeTakeFirst();

  if (!account) {
    console.error(`No account found for Threads user ID: ${threadsUserId}`);
    return null;
  }

  const now = new Date();
  const expiresAt = new Date(account.token_expires_at);
  const threshold = 1000 * 60 * 60 * 24 * 7; // 7 days

  // Check if token is expired or near expiration
  if (expiresAt.getTime() - now.getTime() < threshold) {
    console.log(
      `Token for user ${threadsUserId} is near expiration or expired. Attempting refresh...`,
    );
    return await refreshAccessToken(threadsUserId);
  }

  try {
    return decrypt(account.access_token_encrypted);
  } catch (err) {
    console.error(`Failed to decrypt token for user ${threadsUserId}:`, err);
    return null;
  }
}

/**
 * Refreshes a long-lived access token.
 */
export async function refreshAccessToken(
  threadsUserId: string,
): Promise<string | null> {
  const db = getDb();
  const account = await db
    .selectFrom("threads_accounts")
    .selectAll()
    .where("threads_user_id", "=", threadsUserId)
    .executeTakeFirst();

  if (!account) return null;

  const oldExpiresAt = account.token_expires_at;

  try {
    const currentToken = decrypt(account.access_token_encrypted);

    // Refresh long-lived token
    // https://developers.facebook.com/docs/threads/access-tokens#refresh-a-long-lived-token
    const response = await fetch(
      `https://graph.threads.net/refresh_access_token?grant_type=th_refresh_token&access_token=${currentToken}`,
    );
    const data = await response.json();

    if (!response.ok) {
      throw new Error(`Failed to refresh token: ${JSON.stringify(data)}`);
    }

    const { access_token: newLongLivedToken, expires_in } = data;
    const now = new Date().toISOString();
    const newExpiresAt = new Date(Date.now() + expires_in * 1000).toISOString();

    await db
      .updateTable("threads_accounts")
      .set({
        access_token_encrypted: encrypt(newLongLivedToken),
        token_expires_at: newExpiresAt,
        token_last_refreshed_at: now,
        token_last_checked_at: now,
        updated_at: now,
      })
      .where("threads_user_id", "=", threadsUserId)
      .execute();

    // 갱신 성공 이력 기록
    try {
      await db
        .insertInto("token_refresh_events")
        .values({
          token_refresh_event_id: uuidv7(),
          threads_user_id: threadsUserId,
          result: "success",
          error_message: null,
          old_expires_at: oldExpiresAt,
          new_expires_at: newExpiresAt,
          created_at: now,
        })
        .execute();
    } catch (logErr) {
      console.error(
        `Failed to log token refresh event for user ${threadsUserId}:`,
        logErr,
      );
    }

    console.log(`Successfully refreshed token for user ${threadsUserId}`);
    return newLongLivedToken;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    console.error(`Error refreshing token for user ${threadsUserId}:`, err);

    // 갱신 실패 이력 기록
    try {
      await db
        .insertInto("token_refresh_events")
        .values({
          token_refresh_event_id: uuidv7(),
          threads_user_id: threadsUserId,
          result: "failed",
          error_message: errorMessage,
          old_expires_at: oldExpiresAt,
          new_expires_at: null,
          created_at: new Date().toISOString(),
        })
        .execute();
    } catch (logErr) {
      console.error(
        `Failed to log token refresh failure for user ${threadsUserId}:`,
        logErr,
      );
    }

    return null;
  }
}

/**
 * Checks all tokens and refreshes those that need it.
 */
export async function checkAndRefreshAllTokens() {
  const db = getDb();
  const accounts = await db
    .selectFrom("threads_accounts")
    .select("threads_user_id")
    .execute();

  for (const account of accounts) {
    await getValidAccessToken(account.threads_user_id);
  }
}
