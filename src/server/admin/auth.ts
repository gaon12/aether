import "@/server/lib/server-only";

import crypto, { randomUUID } from "node:crypto";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE_NAME } from "@/server/admin/constants";
import {
  hashAdminPassword,
  normalizeAdminUsername,
  validateAdminPassword,
  validateAdminUsername,
  verifyAdminPassword,
} from "@/server/admin/password";
import { getDb } from "@/server/db";
import { ensureBootstrapEnv } from "@/server/env/bootstrap";

const ADMIN_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
const THREADS_OAUTH_STATE_MAX_AGE_MS = 1000 * 60 * 10;

interface AdminSessionPayload {
  adminUserId: string;
  expiresAt: number;
}

interface ThreadsOauthStatePayload {
  adminUserId: string;
  expiresAt: number;
  nonce: string;
  purpose: "threads_oauth_state";
}

export function getAdminAuthConfigurationError() {
  ensureBootstrapEnv();
  const signingSecret = process.env.TOKEN_ENCRYPTION_KEY?.trim();

  if (!signingSecret) {
    return "관리자 로그인과 세션을 사용하려면 TOKEN_ENCRYPTION_KEY 환경 변수가 필요합니다.";
  }

  if (signingSecret.length !== 32) {
    return "TOKEN_ENCRYPTION_KEY는 정확히 32자여야 합니다.";
  }

  return null;
}

function getSessionSigningSecret() {
  ensureBootstrapEnv();
  const configurationError = getAdminAuthConfigurationError();
  if (configurationError) {
    throw new Error(configurationError);
  }

  const signingSecret = process.env.TOKEN_ENCRYPTION_KEY?.trim();
  if (!signingSecret) {
    throw new Error(
      "관리자 로그인과 세션을 사용하려면 TOKEN_ENCRYPTION_KEY 환경 변수가 필요합니다.",
    );
  }

  return signingSecret;
}

/**
 * TOKEN_ENCRYPTION_KEY를 직접 세션 서명에 쓰지 않고 HKDF로 별도 파생한다.
 * 암호화 키(AES-256-GCM)와 서명 키(HMAC-SHA256)의 재사용을 방지한다.
 */
function deriveSessionSigningKey(): Buffer {
  const masterKey = getSessionSigningSecret();
  return Buffer.from(
    crypto.hkdfSync(
      "sha256",
      Buffer.from(masterKey, "utf8"),
      Buffer.alloc(0),
      Buffer.from("aether-admin-session-v1", "utf8"),
      32,
    ),
  );
}

function signSessionPayload(payload: string) {
  return crypto
    .createHmac("sha256", deriveSessionSigningKey())
    .update(payload)
    .digest("base64url");
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function createSignedPayloadToken(payload: object) {
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
    "base64url",
  );
  const signature = signSessionPayload(encodedPayload);

  return `${encodedPayload}.${signature}`;
}

function parseSignedPayload<T>(token: string | null | undefined) {
  if (!token) {
    return null;
  }

  if (getAdminAuthConfigurationError()) {
    return null;
  }

  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = signSessionPayload(encodedPayload);
  if (!safeEqual(signature, expectedSignature)) {
    return null;
  }

  try {
    return JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    ) as Partial<T>;
  } catch {
    return null;
  }
}

function createSessionToken(payload: AdminSessionPayload) {
  return createSignedPayloadToken(payload);
}

function parseSessionToken(token: string | null | undefined) {
  const payload = parseSignedPayload<AdminSessionPayload>(token);

  if (
    !payload ||
    typeof payload.adminUserId !== "string" ||
    typeof payload.expiresAt !== "number"
  ) {
    return null;
  }

  if (payload.expiresAt <= Date.now()) {
    return null;
  }

  return payload as AdminSessionPayload;
}

function getCookieValueFromHeader(cookieHeader: string | null, name: string) {
  if (!cookieHeader) {
    return null;
  }

  for (const part of cookieHeader.split(";")) {
    const [rawKey, ...rawValue] = part.trim().split("=");
    if (rawKey !== name) {
      continue;
    }

    return rawValue.join("=") || null;
  }

  return null;
}

async function getAdminUserById(adminUserId: string) {
  const db = getDb();

  return db
    .selectFrom("admin_users")
    .selectAll()
    .where("admin_user_id", "=", adminUserId)
    .executeTakeFirst();
}

async function getAdminUserByUsername(username: string) {
  const db = getDb();

  return db
    .selectFrom("admin_users")
    .selectAll()
    .where("username", "=", normalizeAdminUsername(username))
    .executeTakeFirst();
}

export async function hasAdminUser() {
  const db = getDb();
  const adminUser = await db
    .selectFrom("admin_users")
    .select("admin_user_id")
    .limit(1)
    .executeTakeFirst();

  return Boolean(adminUser);
}

export async function createAdminUser(input: {
  username: string;
  password: string;
}) {
  const db = getDb();

  const existingAdmin = await db
    .selectFrom("admin_users")
    .select("admin_user_id")
    .limit(1)
    .executeTakeFirst();

  if (existingAdmin) {
    throw new Error("관리자 계정은 이미 생성되어 있습니다.");
  }

  const username = validateAdminUsername(input.username);
  const password = validateAdminPassword(input.password);
  const { hash, salt } = hashAdminPassword(password);
  const now = new Date().toISOString();
  const adminUserId = randomUUID();

  await db
    .insertInto("admin_users")
    .values({
      admin_user_id: adminUserId,
      username,
      password_hash: hash,
      password_salt: salt,
      created_at: now,
      updated_at: now,
      last_login_at: now,
    })
    .execute();

  return {
    adminUserId,
    username,
  };
}

export async function authenticateAdminUser(input: {
  username: string;
  password: string;
}) {
  const username = validateAdminUsername(input.username);
  const adminUser = await getAdminUserByUsername(username);

  if (!adminUser) {
    return null;
  }

  if (
    !verifyAdminPassword(
      input.password,
      adminUser.password_hash,
      adminUser.password_salt,
    )
  ) {
    return null;
  }

  const now = new Date().toISOString();
  const db = getDb();

  await db
    .updateTable("admin_users")
    .set({
      last_login_at: now,
      updated_at: now,
    })
    .where("admin_user_id", "=", adminUser.admin_user_id)
    .execute();

  return {
    adminUserId: adminUser.admin_user_id,
    username: adminUser.username,
  };
}

export function attachAdminSessionCookie(
  response: NextResponse,
  session: { adminUserId: string },
) {
  const token = createSessionToken({
    adminUserId: session.adminUserId,
    expiresAt: Date.now() + ADMIN_SESSION_MAX_AGE_SECONDS * 1000,
  });

  response.cookies.set({
    name: ADMIN_SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
  });
}

export function clearAdminSessionCookie(response: NextResponse) {
  response.cookies.set({
    name: ADMIN_SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

async function resolveAdminSession(token: string | null | undefined) {
  const parsedToken = parseSessionToken(token);
  if (!parsedToken) {
    return null;
  }

  const adminUser = await getAdminUserById(parsedToken.adminUserId);
  if (!adminUser) {
    return null;
  }

  return {
    adminUserId: adminUser.admin_user_id,
    username: adminUser.username,
    expiresAt: parsedToken.expiresAt,
  };
}

export async function getAdminSession() {
  const cookieStore = await cookies();

  return resolveAdminSession(cookieStore.get(ADMIN_SESSION_COOKIE_NAME)?.value);
}

export async function getAdminSessionFromRequest(
  request: Pick<Request, "headers">,
) {
  return resolveAdminSession(
    getCookieValueFromHeader(
      request.headers.get("cookie"),
      ADMIN_SESSION_COOKIE_NAME,
    ),
  );
}

export function createThreadsOauthState(adminUserId: string) {
  return createSignedPayloadToken({
    adminUserId,
    expiresAt: Date.now() + THREADS_OAUTH_STATE_MAX_AGE_MS,
    nonce: randomUUID(),
    purpose: "threads_oauth_state",
  } satisfies ThreadsOauthStatePayload);
}

export function verifyThreadsOauthState(
  token: string | null | undefined,
  expectedAdminUserId?: string,
) {
  const payload = parseSignedPayload<ThreadsOauthStatePayload>(token);

  if (
    !payload ||
    payload.purpose !== "threads_oauth_state" ||
    typeof payload.adminUserId !== "string" ||
    typeof payload.expiresAt !== "number" ||
    typeof payload.nonce !== "string"
  ) {
    return null;
  }

  if (payload.expiresAt <= Date.now()) {
    return null;
  }

  if (expectedAdminUserId && payload.adminUserId !== expectedAdminUserId) {
    return null;
  }

  return payload as ThreadsOauthStatePayload;
}

export async function requireAdminPageAccess() {
  if (!(await hasAdminUser())) {
    redirect("/setup");
  }

  const authConfigurationError = getAdminAuthConfigurationError();
  if (authConfigurationError) {
    redirect(`/login?error=${encodeURIComponent(authConfigurationError)}`);
  }

  const session = await getAdminSession();
  if (!session) {
    redirect("/login");
  }

  return session;
}
