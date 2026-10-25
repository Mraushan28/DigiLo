import crypto from "node:crypto";

/**
 * Derives a 32-byte encryption key from the environment variable TOKEN_ENCRYPTION_KEY.
 * Falls back to a deterministic development key with a console warning if not set.
 */
function getEncryptionKey(): Buffer {
  const envKey = process.env.TOKEN_ENCRYPTION_KEY;
  if (!envKey) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("TOKEN_ENCRYPTION_KEY environment variable is required in production.");
    }
    // Dev fallback key derived securely
    return crypto.createHash("sha256").update("digilo_default_development_secret_key_32b!").digest();
  }
  return crypto.createHash("sha256").update(envKey).digest();
}

/**
 * Encrypts a plaintext string using AES-256-GCM.
 * Returns a serialized string format: ivHex:authTagHex:ciphertextHex
 */
export function encryptToken(plainText: string): string {
  if (!plainText) return "";
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12); // Standard 12-byte IV for GCM
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plainText, "utf8"),
    cipher.final()
  ]);

  const tag = cipher.getAuthTag();

  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

/**
 * Decrypts a serialized ciphertext string using AES-256-GCM.
 * Validates the auth tag; throws if tampered with or corrupted.
 */
export function decryptToken(encryptedPayload: string): string {
  if (!encryptedPayload) return "";
  const parts = encryptedPayload.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted token format.");
  }

  const [ivHex, tagHex, cipherHex] = parts;
  const key = getEncryptionKey();
  const iv = Buffer.from(ivHex, "hex");
  const tag = Buffer.from(tagHex, "hex");
  const ciphertext = Buffer.from(cipherHex, "hex");

  try {
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);

    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final()
    ]);

    return decrypted.toString("utf8");
  } catch (err) {
    throw new Error(`Cipher decryption failed: ${err instanceof Error ? err.message : "Authentication tag validation failure"}`);
  }
}
