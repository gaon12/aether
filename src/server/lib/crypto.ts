import "@/server/lib/server-only";

import crypto from "node:crypto";
import { ensureBootstrapEnv } from "@/server/env/bootstrap";

const GCM_ALGORITHM = "aes-256-gcm";
const LEGACY_CBC_ALGORITHM = "aes-256-cbc";
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

function getEncryptionKey() {
  ensureBootstrapEnv();
  const encryptionKey = process.env.TOKEN_ENCRYPTION_KEY?.trim();
  if (!encryptionKey) {
    throw new Error(
      "Missing required environment variable: TOKEN_ENCRYPTION_KEY",
    );
  }

  if (encryptionKey.length !== 32) {
    throw new Error("TOKEN_ENCRYPTION_KEY must be exactly 32 characters long.");
  }

  return Buffer.from(encryptionKey, "utf8");
}

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(GCM_ALGORITHM, getEncryptionKey(), iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");
  return `gcm:${iv.toString("hex")}:${authTag}:${encrypted}`;
}

export function decrypt(text: string): string {
  const segments = text.split(":");

  if (segments[0] === "gcm") {
    const [, ivHex, authTagHex, encryptedText] = segments;
    if (!ivHex || !authTagHex || !encryptedText) {
      throw new Error("Invalid encrypted text format");
    }

    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");

    if (authTag.length !== AUTH_TAG_LENGTH) {
      throw new Error("Invalid encrypted text auth tag");
    }

    const decipher = crypto.createDecipheriv(
      GCM_ALGORITHM,
      getEncryptionKey(),
      iv,
    );
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedText, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  }

  const [ivHex, encryptedText] = segments;
  if (!ivHex || !encryptedText) {
    throw new Error("Invalid encrypted text format");
  }

  const iv = Buffer.from(ivHex, "hex");
  const decipher = crypto.createDecipheriv(
    LEGACY_CBC_ALGORITHM,
    getEncryptionKey(),
    iv,
  );
  let decrypted = decipher.update(encryptedText, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}
