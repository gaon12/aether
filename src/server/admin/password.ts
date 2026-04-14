import "@/server/lib/server-only";

import crypto from "node:crypto";

const PASSWORD_HASH_KEYLEN = 64;
const PASSWORD_SALT_BYTES = 16;
const MIN_PASSWORD_LENGTH = 8;

function derivePasswordHash(password: string, salt: string) {
  return crypto
    .scryptSync(password, salt, PASSWORD_HASH_KEYLEN)
    .toString("hex");
}

export function normalizeAdminUsername(username: string) {
  return username.trim().toLowerCase();
}

export function validateAdminUsername(username: string) {
  const normalizedUsername = normalizeAdminUsername(username);

  if (!/^[a-z0-9._-]{3,32}$/.test(normalizedUsername)) {
    throw new Error(
      "관리자 아이디는 3~32자의 영문 소문자, 숫자, 점(.), 밑줄(_), 하이픈(-)만 사용할 수 있습니다.",
    );
  }

  return normalizedUsername;
}

export function validateAdminPassword(password: string) {
  const trimmedPassword = password.trim();

  if (trimmedPassword.length < MIN_PASSWORD_LENGTH) {
    throw new Error(
      `비밀번호는 최소 ${MIN_PASSWORD_LENGTH}자 이상이어야 합니다.`,
    );
  }

  return trimmedPassword;
}

export function hashAdminPassword(password: string) {
  const salt = crypto.randomBytes(PASSWORD_SALT_BYTES).toString("hex");
  const hash = derivePasswordHash(password, salt);

  return { hash, salt };
}

export function verifyAdminPassword(
  password: string,
  storedHash: string,
  storedSalt: string,
) {
  const derivedHash = Buffer.from(
    derivePasswordHash(password, storedSalt),
    "hex",
  );
  const storedHashBuffer = Buffer.from(storedHash, "hex");

  if (derivedHash.length !== storedHashBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(derivedHash, storedHashBuffer);
}
